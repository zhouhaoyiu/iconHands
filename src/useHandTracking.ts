import { useEffect, useRef, useState } from "react";
import type {
  HandLandmarker as HandLandmarkerInstance,
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL =
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type TrackingStatus =
  | "loading"
  | "camera-request"
  | "tracking"
  | "camera-denied"
  | "error";

export interface PalmDebug {
  /** MediaPipe 报告的左右手标签（未镜像画面下是反的） */
  label: string;
  /** 掌心朝向叉积，符号决定掌心/手背 */
  crossZ: number;
  /** 伸展的手指数（0-4，不含拇指） */
  extended: number;
  /** 手掌是否张开（extended >= 3） */
  open: boolean;
  /** 掌心是否朝向屏幕（仅叉积判定） */
  facingCamera: boolean;
  /** 21 个手部关键点（原始未镜像归一化坐标） */
  landmarks: Array<{ x: number; y: number }> | null;
}

export interface PalmSnapshot {
  /** 画面里检测到手 */
  detected: boolean;
  /** 手掌张开且面向屏幕 */
  facing: boolean;
  /** 握拳（挤压图标） */
  fist: boolean;
  /** 归一化坐标（已镜像，0-1），跟用户的直觉方向一致 */
  x: number;
  y: number;
  debug: PalmDebug;
}

const EMPTY_DEBUG: PalmDebug = {
  label: "-",
  crossZ: 0,
  extended: 0,
  open: false,
  facingCamera: false,
  landmarks: null,
};

function dist(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function analyze(result: HandLandmarkerResult): PalmSnapshot {
  const lm = result.landmarks?.[0];
  if (!lm || lm.length < 21) {
    return {
      detected: false,
      facing: false,
      fist: false,
      x: 0.5,
      y: 0.5,
      debug: EMPTY_DEBUG,
    };
  }

  // 手掌中心：手腕 + 四个掌指关节的均值
  const centerIds = [0, 5, 9, 13, 17];
  let cx = 0;
  let cy = 0;
  for (const id of centerIds) {
    cx += lm[id].x;
    cy += lm[id].y;
  }
  cx /= centerIds.length;
  cy /= centerIds.length;

  // 张开程度：指尖到手腕的距离明显大于掌指关节到手腕的距离
  const fingers: Array<[number, number]> = [
    [8, 5],
    [12, 9],
    [16, 13],
    [20, 17],
  ];
  let extended = 0;
  for (const [tip, mcp] of fingers) {
    if (dist(lm[tip], lm[0]) > dist(lm[mcp], lm[0]) * 1.25) extended++;
  }
  const open = extended >= 3;

  // 手掌朝向：食指根、小指根相对手腕的叉积符号 + 左右手标签
  const v1x = lm[5].x - lm[0].x;
  const v1y = lm[5].y - lm[0].y;
  const v2x = lm[17].x - lm[0].x;
  const v2y = lm[17].y - lm[0].y;
  const crossZ = v1x * v2y - v1y * v2x;

  const handednessList =
    (result as { handedness?: Array<Array<{ categoryName: string }>> })
      .handedness ??
    (result as { handednesses?: Array<Array<{ categoryName: string }>> })
      .handednesses;
  const label = handednessList?.[0]?.[0]?.categoryName ?? "Right";
  // 符号约定按实测校准：标签为 "Left" 时掌心朝屏幕 crossZ > 0，"Right" 时相反
  const facingCamera = label === "Left" ? crossZ > 0 : crossZ < 0;

  return {
    detected: true,
    facing: open && facingCamera,
    fist: extended <= 1, // 四指几乎全收起 = 握拳
    x: 1 - cx, // 镜像，让移动方向符合直觉
    y: cy,
    debug: {
      label,
      crossZ,
      extended,
      open,
      facingCamera,
      landmarks: lm.map((p) => ({ x: p.x, y: p.y })),
    },
  };
}

/**
 * 打开摄像头（不展示画面），用 MediaPipe HandLandmarker 持续检测手掌。
 * 检测结果写入 palmRef（可变引用，供物理循环每帧读取，避免高频 re-render）。
 */
export function useHandTracking() {
  const palmRef = useRef<PalmSnapshot>({
    detected: false,
    facing: false,
    fist: false,
    x: 0.5,
    y: 0.5,
    debug: EMPTY_DEBUG,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("loading");

  if (import.meta.env.DEV) {
    // 调试：控制台可直接写 __palm.current 伪造手掌，驱动完整链路
    (window as unknown as Record<string, unknown>).__palm = palmRef;
  }

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let landmarker: HandLandmarkerInstance | null = null;
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;

    async function init() {
      setStatus("camera-request");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: "user",
          },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        console.warn("Camera unavailable:", err);
        if (!cancelled) setStatus("camera-denied");
        return;
      }
      if (cancelled) return;

      setStatus("loading");
      try {
        const { FilesetResolver, HandLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (err) {
        console.error("HandLandmarker init failed:", err);
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        video.srcObject = null;
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;

      setStatus("tracking");
      let lastVideoTime = -1;
      const loop = () => {
        if (cancelled) return;
        if (
          landmarker &&
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTime
        ) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            palmRef.current = analyze(result);
          } catch (err) {
            console.error("detectForVideo failed:", err);
          }
        }
        rafId = requestAnimationFrame(loop);
      };
      loop();
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      if (videoRef.current === video) videoRef.current = null;
    };
  }, []);

  return { palmRef, videoRef, status };
}
