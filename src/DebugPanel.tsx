import { useEffect, useRef, useState } from "react";
import type { PalmSnapshot, TrackingStatus } from "./useHandTracking";
import type { SceneDebugState } from "./PhysicsScene";
import { t, tBool } from "./i18n";

/** MediaPipe 手部关键点连线（骨架） */
const CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const VIEW_W = 260;
const VIEW_H = 195;

interface Props {
  palmRef: React.MutableRefObject<PalmSnapshot>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  sceneStateRef: React.MutableRefObject<SceneDebugState>;
  status: TrackingStatus;
  /** 常显手掌指示器（方便调样式） */
  showIndicator: boolean;
  onShowIndicator: (v: boolean) => void;
  /** 聚集距离倍率 */
  distance: number;
  onDistance: (v: number) => void;
}

interface Row {
  key: string;
  label: string;
  value: string;
  good?: boolean;
}

export default function DebugPanel({
  palmRef,
  videoRef,
  sceneStateRef,
  status,
  showIndicator,
  onShowIndicator,
  distance,
  onDistance,
}: Props) {
  const [open, setOpen] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const videoBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 骨架叠加：每帧绘制（镜像坐标，与视频的 scaleX(-1) 对齐）
  useEffect(() => {
    if (!open) return;
    let rafId = 0;
    let attached: HTMLVideoElement | null = null;

    const draw = () => {
      rafId = requestAnimationFrame(draw);

      const video = videoRef.current;
      const box = videoBoxRef.current;
      if (box && video && attached !== video) {
        box.querySelectorAll("video").forEach((v) => v.remove());
        box.prepend(video);
        attached = video;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const palm = palmRef.current;
      const lm = palm.debug.landmarks;
      if (!lm) return;

      const px = (x: number) => (1 - x) * W; // 镜像
      const py = (y: number) => y * H;
      const color = palm.facing
        ? "#34c759"
        : palm.debug.open
          ? "#ff9f0a"
          : "#ff453a";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const [a, b] of CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(px(lm[a].x), py(lm[a].y));
        ctx.lineTo(px(lm[b].x), py(lm[b].y));
        ctx.stroke();
      }
      ctx.fillStyle = color;
      for (const p of lm) {
        ctx.beginPath();
        ctx.arc(px(p.x), py(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // 掌心（吸引点）；palm.x 已镜像，直接乘宽度即与镜像画面对齐
      ctx.beginPath();
      ctx.arc(palm.x * W, palm.y * H, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [open, palmRef, videoRef]);

  // 文本信息低频刷新
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      const p = palmRef.current;
      const d = p.debug;
      const s = sceneStateRef.current;
      setRows([
        { key: "status", label: t("rowStatus"), value: status, good: status === "tracking" },
        { key: "detected", label: t("rowDetected"), value: tBool(p.detected), good: p.detected },
        { key: "extended", label: t("rowExtended"), value: `${d.extended} / 4`, good: d.open },
        { key: "open", label: t("rowOpen"), value: tBool(d.open), good: d.open },
        { key: "facingCam", label: t("rowFacingCam"), value: tBool(d.facingCamera), good: d.facingCamera },
        { key: "crossZ", label: "crossZ", value: d.crossZ.toFixed(4) },
        { key: "label", label: t("rowHandedness"), value: d.label },
        { key: "gesture", label: t("rowGesture"), value: p.fist ? t("gestureFist") : d.open ? t("gestureOpen") : "—" },
        { key: "facing", label: t("rowVerdict"), value: p.fist ? t("verdictSqueeze") : p.facing ? t("verdictAttract") : "—", good: p.facing || p.fist },
        { key: "palm", label: t("rowPalmPos"), value: p.detected ? `${p.x.toFixed(2)}, ${p.y.toFixed(2)}` : "—" },
        { key: "attract", label: t("rowAttracting"), value: tBool(s.attracting), good: s.attracting },
        { key: "speed", label: t("rowPalmSpeed"), value: `${s.palmSpeed} px/s` },
        { key: "flung", label: t("rowFlung"), value: s.flung ? t("flungValue") : "—", good: s.flung },
      ]);
    }, 120);
    return () => clearInterval(timer);
  }, [open, palmRef, sceneStateRef, status]);

  if (!open) {
    return (
      <button className="debug-toggle" onClick={() => setOpen(true)}>
        {t("debugToggle")}
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <span>{t("debugTitle")}</span>
        <button onClick={() => setOpen(false)}>{t("debugCollapse")}</button>
      </div>
      <div className="debug-video" ref={videoBoxRef}>
        <canvas ref={canvasRef} width={VIEW_W * 2} height={VIEW_H * 2} />
        {status !== "tracking" && (
          <div className="debug-video-placeholder">
            {t("debugCameraNotReady")}
          </div>
        )}
      </div>
      <div className="debug-controls">
        <label className="debug-control">
          <span>{t("debugShowIndicator")}</span>
          <input
            type="checkbox"
            checked={showIndicator}
            onChange={(e) => onShowIndicator(e.target.checked)}
          />
        </label>
        <label className="debug-control">
          <span>{t("debugDistance")}</span>
          <input
            type="range"
            min={0.3}
            max={2}
            step={0.05}
            value={distance}
            onChange={(e) => onDistance(Number(e.target.value))}
          />
          <span className="debug-value">{distance.toFixed(2)}x</span>
        </label>
      </div>
      <div className="debug-rows">
        {rows.map((r) => (
          <div className="debug-row" key={r.key}>
            <span className="debug-label">{r.label}</span>
            <span
              className={
                r.good === undefined
                  ? "debug-value"
                  : r.good
                    ? "debug-value good"
                    : "debug-value bad"
              }
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
