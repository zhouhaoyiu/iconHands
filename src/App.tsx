import { useEffect, useRef, useState } from "react";
import PhysicsScene, {
  type SceneControls,
  type SceneDebugState,
} from "./PhysicsScene";
import DebugPanel from "./DebugPanel";
import { useHandTracking } from "./useHandTracking";
import { t } from "./i18n";

export default function App() {
  const { palmRef, videoRef, trackingStatsRef, status } = useHandTracking();
  const sceneStateRef = useRef<SceneDebugState>({
    attracting: false,
    targetX: 0,
    targetY: 0,
    palmSpeed: 0,
    flung: false,
    handCount: 0,
    repelling: false,
    poster: false,
  });
  // 调试面板的控制项
  const [showIndicator, setShowIndicator] = useState(false);
  const [distance, setDistance] = useState(1);
  const controlsRef = useRef<SceneControls>({ distance: 1 });
  useEffect(() => {
    controlsRef.current.distance = distance;
  }, [distance]);
  // palmRef 是高频可变引用，HUD 低频轮询它来更新文案
  const [palmUi, setPalmUi] = useState({
    detected: false,
    facing: false,
    fist: false,
    flung: false,
    x: 0.5,
    y: 0.5,
  });

  useEffect(() => {
    document.title = t("pageTitle");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const p = palmRef.current;
      const flung = sceneStateRef.current.flung;
      setPalmUi((prev) =>
        prev.detected === p.detected &&
        prev.facing === p.facing &&
        prev.fist === p.fist &&
        prev.flung === flung &&
        Math.abs(prev.x - p.x) < 0.01 &&
        Math.abs(prev.y - p.y) < 0.01
          ? prev
          : {
              detected: p.detected,
              facing: p.facing,
              fist: p.fist,
              flung,
              x: p.x,
              y: p.y,
            }
      );
    }, 100);
    return () => clearInterval(timer);
  }, [palmRef]);

  let dotClass = "dot";
  let text = "";
  switch (status) {
    case "loading":
      text = t("hudLoading");
      break;
    case "camera-request":
      text = t("hudCameraRequest");
      break;
    case "camera-denied":
      dotClass = "dot warn";
      text = t("hudCameraDenied");
      break;
    case "error":
      dotClass = "dot warn";
      text = t("hudError");
      break;
    case "tracking":
      if (palmUi.flung) {
        dotClass = "dot warn";
        text = t("hudFlung");
      } else if (palmUi.fist) {
        dotClass = "dot active";
        text = t("hudFist");
      } else if (palmUi.facing) {
        dotClass = "dot active";
        text = t("hudFacing");
      } else if (palmUi.detected) {
        text = t("hudOpenPrompt");
      } else {
        text = t("hudShowPalm");
      }
      break;
  }

  return (
    <div className="stage">
      <PhysicsScene
        palmRef={palmRef}
        sceneStateRef={sceneStateRef}
        controlsRef={controlsRef}
      />
      <div className="hud">
        <span className={dotClass} />
        <span>{text}</span>
      </div>
      <div className="hint">{t("hint")}</div>
      <div
        className={
          "palm-indicator" +
          (palmUi.detected || showIndicator ? " show" : "") +
          (palmUi.facing || palmUi.fist ? " active" : "")
        }
        style={{ left: `${palmUi.x * 100}%`, top: `${palmUi.y * 100}%` }}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 张开的手掌：四指 + 拇指虎口轮廓 */}
          <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
          <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      </div>
      <DebugPanel
        palmRef={palmRef}
        videoRef={videoRef}
        trackingStatsRef={trackingStatsRef}
        sceneStateRef={sceneStateRef}
        status={status}
        showIndicator={showIndicator}
        onShowIndicator={setShowIndicator}
        distance={distance}
        onDistance={setDistance}
      />
    </div>
  );
}
