import { useEffect, useRef, useState } from "react";
import type {
  HandLandmarker as HandLandmarkerInstance,
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL =
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "/models/hand_landmarker-float16-v1.task";

async function loadRuntime() {
  const { FilesetResolver, HandLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return { HandLandmarker, vision };
}

async function loadModel(signal: AbortSignal) {
  const response = await fetch(MODEL_URL, { signal });
  if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export type TrackingStatus =
  | "loading"
  | "camera-request"
  | "tracking"
  | "camera-denied"
  | "error";

export interface TrackingStats {
  inferenceFps: number;
  sourceFps: number;
  width: number;
  height: number;
}

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

export interface HandPoint {
  /** 画面里检测到手 */
  detected: boolean;
  /** 手掌张开且面向屏幕 */
  facing: boolean;
  /** 握拳（挤压图标） */
  fist: boolean;
  /** 手掌张开 */
  open: boolean;
  /** 归一化坐标（已镜像，0-1），跟用户的直觉方向一致 */
  x: number;
  y: number;
  /** MediaPipe 报告的左右手标签 */
  label: string;
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
  /** 当前检测到的所有手。第一只保持原单手行为；双手时物理层可取第二只做排斥。 */
  hands: HandPoint[];
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

function emptySnapshot(): PalmSnapshot {
  return {
    detected: false,
    facing: false,
    fist: false,
    x: 0.5,
    y: 0.5,
    hands: [],
    debug: EMPTY_DEBUG,
  };
}

function analyzeHand(lm: NormalizedLandmark[], label: string) {
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

  // 符号约定按实测校准：标签为 "Left" 时掌心朝屏幕 crossZ > 0，"Right" 时相反
  const facingCamera = label === "Left" ? crossZ > 0 : crossZ < 0;
  const x = 1 - cx; // 镜像，让移动方向符合直觉
  const y = cy;

  return {
    hand: {
      detected: true,
      facing: open && facingCamera,
      fist: extended <= 1,
      open,
      x,
      y,
      label,
    },
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

function analyze(result: HandLandmarkerResult): PalmSnapshot {
  const handednessList =
    (result as { handedness?: Array<Array<{ categoryName: string }>> })
      .handedness ??
    (result as { handednesses?: Array<Array<{ categoryName: string }>> })
      .handednesses;
  const analyzed = (result.landmarks ?? [])
    .map((lm, i) =>
      lm.length >= 21
        ? analyzeHand(lm, handednessList?.[i]?.[0]?.categoryName ?? "Right")
        : null
    )
    .filter((hand): hand is ReturnType<typeof analyzeHand> => hand !== null);

  if (analyzed.length === 0) return emptySnapshot();

  analyzed.sort((a, b) => a.hand.x - b.hand.x);
  const primary = analyzed[0];

  return {
    detected: true,
    facing: primary.hand.facing,
    fist: primary.hand.fist,
    x: primary.hand.x,
    y: primary.hand.y,
    hands: analyzed.map((item) => item.hand),
    debug: primary.debug,
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
    hands: [],
    debug: EMPTY_DEBUG,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackingStatsRef = useRef<TrackingStats>({
    inferenceFps: 0,
    sourceFps: 0,
    width: 0,
    height: 0,
  });
  const [status, setStatus] = useState<TrackingStatus>("loading");

  if (import.meta.env.DEV) {
    // 调试：控制台可直接写 __palm.current 伪造手掌，驱动完整链路
    (window as unknown as Record<string, unknown>).__palm = palmRef;
  }

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let videoFrameId = 0;
    let stream: MediaStream | null = null;
    let landmarker: HandLandmarkerInstance | null = null;
    const modelController = new AbortController();
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;

    async function init() {
      setStatus("camera-request");
      const assetsPromise = Promise.all([
        loadRuntime(),
        loadModel(modelController.signal),
      ])
        .then(([runtime, model]) => ({ runtime, model, error: null }))
        .catch((error: unknown) => ({ runtime: null, error }));
      let acquiredStream: MediaStream | null = null;
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: "user",
          },
          audio: false,
        });
        if (cancelled) {
          acquiredStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = acquiredStream;
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        acquiredStream?.getTracks().forEach((track) => track.stop());
        stream = null;
        video.srcObject = null;
        modelController.abort();
        console.warn("Camera unavailable:", err);
        if (!cancelled) setStatus("camera-denied");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
        video.srcObject = null;
        return;
      }

      const settings = stream.getVideoTracks()[0]?.getSettings();
      trackingStatsRef.current = {
        inferenceFps: 0,
        sourceFps: settings?.frameRate ?? 0,
        width: settings?.width ?? video.videoWidth,
        height: settings?.height ?? video.videoHeight,
      };

      setStatus("loading");
      try {
        const assets = await assetsPromise;
        if (assets.error || !assets.runtime || !("model" in assets)) {
          throw assets.error;
        }
        const createdLandmarker = await assets.runtime.HandLandmarker.createFromOptions(
          assets.runtime.vision,
          {
            baseOptions: {
              modelAssetBuffer: assets.model,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }
        );
        if (cancelled) {
          createdLandmarker.close();
          return;
        }
        landmarker = createdLandmarker;
      } catch (err) {
        if (!cancelled) console.error("HandLandmarker init failed:", err);
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        video.srcObject = null;
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;

      setStatus("tracking");
      let lastVideoTime = -1;
      let inferenceFrames = 0;
      let statsStartedAt = performance.now();
      const schedule = () => {
        if ("requestVideoFrameCallback" in video) {
          videoFrameId = video.requestVideoFrameCallback(loop);
        } else {
          rafId = requestAnimationFrame(loop);
        }
      };
      const loop = (now: number) => {
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
            inferenceFrames++;
          } catch (err) {
            console.error("detectForVideo failed:", err);
          }
        }
        const elapsed = now - statsStartedAt;
        if (elapsed >= 1000) {
          trackingStatsRef.current = {
            ...trackingStatsRef.current,
            inferenceFps: Math.round((inferenceFrames * 10000) / elapsed) / 10,
          };
          inferenceFrames = 0;
          statsStartedAt = now;
        }
        schedule();
      };
      schedule();
    }

    init();

    return () => {
      cancelled = true;
      modelController.abort();
      cancelAnimationFrame(rafId);
      if (videoFrameId) video.cancelVideoFrameCallback(videoFrameId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      if (videoRef.current === video) videoRef.current = null;
    };
  }, []);

  return { palmRef, videoRef, trackingStatsRef, status };
}
