import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { makeIconTexture, type IconTexture } from "./iconTextures";
import {
  createReleaseGestureState,
  updateReleaseGesture,
} from "./releaseGesture";
import type { PalmSnapshot } from "./useHandTracking";

const DESKTOP_ICON_COUNT = 96;
const MOBILE_ICON_COUNT = 56;
const MIN_SIZE = 38;
const MAX_SIZE = 68;

/** 聚集弹簧刚度（accel = k * 距离，单位随 matter 内部积分） */
const SPRING_K = 2.6e-6;
/** 环绕切向力 */
const SWIRL_K = 3.2e-4;
/** 聚集时的最大速度（px/frame） */
const MAX_ATTRACT_SPEED = 26;
const RELEASE_BURST_SPEED = 34;
const CATEGORY_COUNT = 8;
const CATEGORY_COLORS = [
  "#0f3d2e",
  "#17324d",
  "#5a1f2c",
  "#233876",
  "#3d2a73",
  "#24524a",
  "#6b2d1f",
  "#203447",
];

interface IconBody {
  body: Matter.Body;
  size: number;
  texture: IconTexture;
  /** 围绕手掌的目标偏移（极坐标，缓慢公转） */
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  /** 学院/学科色块分类，用于张手时分层散开 */
  category: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

interface TrailPoint {
  x: number;
  y: number;
  life: number;
  size: number;
}

export interface SceneDebugState {
  attracting: boolean;
  targetX: number;
  targetY: number;
  /** 手掌移动速度（px/s，平滑后） */
  palmSpeed: number;
  /** 刚甩出（冷却期内） */
  flung: boolean;
  /** 当前检测到的手数 */
  handCount: number;
  /** 第二只手是否在排斥 */
  repelling: boolean;
  /** 张手释放后的短暂停帧 */
  poster: boolean;
}

export interface SceneControls {
  /** 聚集距离倍率（0.3 近 — 2 远） */
  distance: number;
}

interface Props {
  palmRef: React.MutableRefObject<PalmSnapshot>;
  sceneStateRef?: React.MutableRefObject<SceneDebugState>;
  controlsRef?: React.MutableRefObject<SceneControls>;
}

function iconCountForWidth(width: number) {
  return width < 640 ? MOBILE_ICON_COUNT : DESKTOP_ICON_COUNT;
}

function burstIcons(
  icons: IconBody[],
  x: number,
  y: number,
  speed: number,
  pushX = 0,
  pushY = 0,
  layered = false
) {
  for (const icon of icons) {
    const { body } = icon;
    body.collisionFilter.group = 0;
    let dx = body.position.x - x;
    let dy = body.position.y - y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    if (layered) {
      const layerAngle =
        (icon.category / CATEGORY_COUNT) * Math.PI * 2 +
        (Math.random() - 0.5) * 0.35;
      dx = dx * 0.45 + Math.cos(layerAngle) * 0.55;
      dy = dy * 0.45 + Math.sin(layerAngle) * 0.55;
      const nd = Math.hypot(dx, dy) || 1;
      dx /= nd;
      dy /= nd;
    }
    const tangent = Math.random() < 0.5 ? -1 : 1;
    const jitter = 0.75 + Math.random() * 0.65 + icon.category * 0.06;
    Matter.Body.setVelocity(body, {
      x: dx * speed * jitter + -dy * speed * 0.28 * tangent + pushX,
      y: dy * speed * jitter + dx * speed * 0.28 * tangent + pushY - speed * 0.25,
    });
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.95);
  }
}

function spawnSparks(sparks: Spark[], x: number, y: number) {
  const colors = ["#d8ae45", "#f7df8c", "#ffffff", ...CATEGORY_COLORS];
  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 7 + Math.random() * 18;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      life: 0.45 + Math.random() * 0.45,
      size: 2 + Math.random() * 3,
      color: colors[i % colors.length],
    });
  }
}

export default function PhysicsScene({
  palmRef,
  sceneStateRef,
  controlsRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fonts = document.fonts;
    const ready = fonts ? fonts.load("96px fc-icon") : Promise.resolve();
    ready
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFontReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontReady) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;

    let w = window.innerWidth;
    let h = window.innerHeight;

    // ---- 静态边界：地面 + 左右墙 + 高处天花板 ----
    const wallOpts = { isStatic: true, friction: 0.4, restitution: 0.2 };
    const floor = Matter.Bodies.rectangle(w / 2, h + 50, w * 4, 100, wallOpts);
    const left = Matter.Bodies.rectangle(-50, h / 2 - h, 100, h * 6, wallOpts);
    const right = Matter.Bodies.rectangle(w + 50, h / 2 - h, 100, h * 6, wallOpts);
    const ceiling = Matter.Bodies.rectangle(w / 2, -2200, w * 4, 100, wallOpts);
    Matter.Composite.add(engine.world, [floor, left, right, ceiling]);

    // ---- 图标刚体：圆角矩形，从屏幕上方分批落下 ----
    const icons: IconBody[] = [];
    const iconCount = iconCountForWidth(w);
    for (let i = 0; i < iconCount; i++) {
      const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
      const category = i % CATEGORY_COUNT;
      const body = Matter.Bodies.rectangle(
        40 + Math.random() * Math.max(w - 80, 80),
        -60 - Math.random() * 1400,
        size,
        size,
        {
          chamfer: { radius: size * 0.22 },
          restitution: 0.35,
          friction: 0.3,
          frictionAir: 0.012,
          angle: Math.random() * Math.PI * 2,
        }
      );
      const icon: IconBody = {
        body,
        size,
        texture: makeIconTexture(i, 96),
        orbitRadius: 30 + Math.random() * Math.min(w, h) * 0.18,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.5),
        category,
      };
      icons.push(icon);
      Matter.Composite.add(engine.world, body);
    }

    // ---- 鼠标/触摸兜底：按住即可吸引（无摄像头时也能玩） ----
    const pointer = { active: false, x: 0.5, y: 0.5 };
    // 调试：?attract=0.5,0.4 强制在指定归一化坐标聚集
    const attractParam = new URLSearchParams(location.search).get("attract");
    const forcedAttract = attractParam !== null;
    if (forcedAttract) {
      const [px, py] = attractParam.split(",").map(Number);
      pointer.active = true;
      pointer.x = Number.isFinite(px) ? px : 0.5;
      pointer.y = Number.isFinite(py) ? py : 0.4;
    }
    const onPointerDown = (e: PointerEvent) => {
      pointer.active = true;
      pointer.x = e.clientX / w;
      pointer.y = e.clientY / h;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointer.active) return;
      pointer.x = e.clientX / w;
      pointer.y = e.clientY / h;
    };
    const onPointerUp = () => {
      if (forcedAttract) return;
      pointer.active = false;
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    // ---- 尺寸自适应 ----
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Matter.Body.setPosition(floor, { x: w / 2, y: h + 50 });
      Matter.Body.setPosition(left, { x: -50, y: h / 2 - h });
      Matter.Body.setPosition(right, { x: w + 50, y: h / 2 - h });
    };
    resize();
    window.addEventListener("resize", resize);

    // ---- 主循环：吸引/下落两种状态 + 迟滞去抖 ----
    let attracting = false;
    let squeeze = 0; // 0 = 松散云团，1 = 握拳挤压
    let facingTime = 0; // 连续检测到的秒数
    let lostTime = 0; // 连续丢失的秒数
    // 抛出手势：握拳抓住 → 快速挥动中张开/移开 → 抛出
    let prevRawX = 0;
    let prevRawY = 0;
    let prevHandPresent = false;
    let palmVelX = 0;
    let palmVelY = 0;
    const releaseGesture = createReleaseGestureState();
    let flingCooldown = 0; // 抛出后的冷却（秒），期间不吸引
    let releaseCooldown = 0; // 正常松手落下后的短冷却（秒），让下落有承诺感
    let startupCooldown = forcedAttract ? 0 : 2.5; // 开场冷却（秒）：让初始的图标雨自然落完
    let accMs = 0; // 固定步长物理的时间累加器（与屏幕刷新率解耦）
    const target = { x: w / 2, y: h * 0.45 }; // 平滑后的聚集点
    const sparks: Spark[] = [];
    const trail: TrailPoint[] = [];
    let trailClock = 0;
    let posterHold = 0;
    let posterTime = 0;
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dtSec = Math.min((now - lastTime) / 1000, 1 / 24);
      lastTime = now;

      const palm = palmRef.current;
      const hands = (palm.hands ?? []).filter((hand) => hand.detected);
      let attractHand = hands[0];
      let repelHand = hands.length > 1 ? hands[1] : undefined;
      if (hands.length > 1) {
        const sorted = [...hands].sort((a, b) => a.x - b.x);
        attractHand = sorted[0];
        repelHand = sorted[sorted.length - 1];
      }
      const controlHand = pointer.active ? undefined : attractHand;
      const fistNow = Boolean(controlHand?.fist ?? (palm.detected && palm.fist));
      const controlOpen = controlHand?.open ?? palm.debug.open;
      const controlFacing = controlHand?.facing ?? palm.facing;
      const handPresent = Boolean(pointer.active || controlHand || palm.detected);
      const rawX = (pointer.active ? pointer.x : (controlHand?.x ?? palm.x)) * w;
      const rawY = (pointer.active ? pointer.y : (controlHand?.y ?? palm.y)) * h;
      const activeRepelHand = pointer.active ? undefined : repelHand;

      // ---- 手掌速度跟踪（px/s，平滑） ----
      if (handPresent && prevHandPresent && dtSec > 0) {
        palmVelX += ((rawX - prevRawX) / dtSec - palmVelX) * 0.35;
        palmVelY += ((rawY - prevRawY) / dtSec - palmVelY) * 0.35;
      } else {
        palmVelX *= 0.7;
        palmVelY *= 0.7;
      }
      prevRawX = rawX;
      prevRawY = rawY;
      prevHandPresent = handPresent;
      const palmSpeed = Math.hypot(palmVelX, palmVelY);
      trailClock += dtSec;
      if (handPresent && trailClock >= 0.028) {
        trail.push({
          x: rawX,
          y: rawY,
          life: 0.62,
          size: 7 + Math.min(palmSpeed / 90, 18),
        });
        if (trail.length > 34) trail.shift();
        trailClock = 0;
      }

      startupCooldown = Math.max(0, startupCooldown - dtSec);
      flingCooldown = Math.max(0, flingCooldown - dtSec);
      releaseCooldown = Math.max(0, releaseCooldown - dtSec);
      posterHold = Math.max(0, posterHold - dtSec);
      posterTime = Math.max(0, posterTime - dtSec);

      // ---- 抛出：按 hwang 原逻辑，握住/吸住后松开才散开 ----
      const throwSpeed = Math.max(w, h) * 0.9;
      const releasedGrip = updateReleaseGesture(releaseGesture, {
        fist: fistNow,
        open: Boolean(controlOpen && controlFacing && !pointer.active && handPresent),
        attracting,
        squeeze,
        dtSec,
      });
      if (releasedGrip && flingCooldown === 0) {
        const directed = palmSpeed > throwSpeed;
        const dirX = directed ? palmVelX / palmSpeed : 0;
        const dirY = directed ? palmVelY / palmSpeed : 0;
        const throwV = directed ? Math.min((palmSpeed / 60) * 1.15, 48) : 0;
        burstIcons(
          icons,
          target.x,
          target.y,
          RELEASE_BURST_SPEED,
          dirX * throwV,
          dirY * throwV,
          true
        );
        spawnSparks(sparks, target.x, target.y);
        posterHold = 0.16;
        posterTime = 0.95;
        flingCooldown = 1.2;
        releaseCooldown = 0.2;
        attracting = false;
        facingTime = 0;
        squeeze = 0;
      }

      const wantAttract =
        handPresent &&
        flingCooldown === 0 &&
        releaseCooldown === 0 &&
        startupCooldown === 0;
      if (wantAttract) {
        facingTime += dtSec;
        lostTime = 0;
      } else {
        lostTime += dtSec;
        facingTime = 0;
      }
      // 持续 0.07s 检测到才开始聚集，丢失 0.23s 才落下，避免闪烁
      if (!attracting && facingTime >= 0.07) attracting = true;
      if (attracting && lostTime >= 0.23) {
        attracting = false;
        releaseCooldown = 0.25;
      }

      if (attracting) {
        const follow = 0.2 + 0.18 * squeeze;
        target.x += (rawX - target.x) * follow;
        target.y += (rawY - target.y) * follow;
      }

      // 握拳 → 挤压系数渐变到 1：聚集半径收紧、吸引力增强、图标间可堆叠
      squeeze += ((attracting && fistNow ? 1 : 0) - squeeze) * 0.08;

      engine.gravity.y = attracting ? 0 : 1;
      if (sceneStateRef) {
        sceneStateRef.current = {
          attracting,
          targetX: target.x,
          targetY: target.y,
          palmSpeed: Math.round(palmSpeed),
          flung: flingCooldown > 0,
          handCount: hands.length,
          repelling: Boolean(activeRepelHand),
          poster: posterTime > 0,
        };
      }

      // ---- 固定 60Hz 步长推进物理，与屏幕刷新率解耦（120Hz 屏不再快一倍） ----
      const stackable = squeeze > 0.55;
      const freezePoster = posterHold > 0;
      const STEP_MS = 1000 / 60;
      const SUB = 1 / 60;
      accMs = Math.min(accMs + dtSec * 1000, STEP_MS * 3); // 防积压
      while (accMs >= STEP_MS - 0.01) {
        accMs -= STEP_MS;
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].life -= SUB;
          if (trail[i].life <= 0) trail.splice(i, 1);
        }
        if (!freezePoster) {
          for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.vy += 0.24;
            spark.life -= SUB;
            if (spark.life <= 0) sparks.splice(i, 1);
          }
        }
        for (const icon of icons) {
          const { body } = icon;
          body.frictionAir = attracting ? 0.05 + 0.04 * squeeze : 0.012;
          body.collisionFilter.group = stackable ? -1 : 0;

          if (attracting) {
            icon.orbitAngle += icon.orbitSpeed * SUB;
            // 挤压时聚集半径收紧到 15%，弹簧刚度放大；distance 控制整体远近
            const distance = controlsRef?.current.distance ?? 1;
            const ball = squeeze * squeeze;
            const radius = Math.max(
              icon.orbitRadius * distance * (1 - 0.92 * ball),
              4 + (icon.category % 4) * 1.5
            );
            const k = SPRING_K * (1 + 7 * ball);
            const tx = target.x + Math.cos(icon.orbitAngle) * radius;
            const ty = target.y + Math.sin(icon.orbitAngle) * radius;

            let dx = tx - body.position.x;
            let dy = ty - body.position.y;
            const d = Math.hypot(dx, dy);
            if (d > 600) {
              dx = (dx / d) * 600;
              dy = (dy / d) * 600;
            }
            // 弹簧吸引 + 轻微切向环绕（挤压时环绕减弱）
            const swirl =
              SWIRL_K * Math.sign(icon.orbitSpeed) * 0.2 * (1 - squeeze);
            const fx = body.mass * (dx * k + (-dy / (d + 1)) * swirl);
            const fy = body.mass * (dy * k + (dx / (d + 1)) * swirl);
            Matter.Body.applyForce(body, body.position, { x: fx, y: fy });

            const speed = Math.hypot(body.velocity.x, body.velocity.y);
            if (speed > MAX_ATTRACT_SPEED) {
              Matter.Body.setVelocity(body, {
                x: (body.velocity.x / speed) * MAX_ATTRACT_SPEED,
                y: (body.velocity.y / speed) * MAX_ATTRACT_SPEED,
              });
            }
            // 缓慢摆正角度，聚集时更像悬浮的 app 图标
            Matter.Body.setAngularVelocity(
              body,
              body.angularVelocity * 0.92 - body.angle * 0.002
            );
          }

          if (activeRepelHand && !freezePoster) {
            const rx = activeRepelHand.x * w;
            const ry = activeRepelHand.y * h;
            let dx = body.position.x - rx;
            let dy = body.position.y - ry;
            const d = Math.hypot(dx, dy) || 1;
            const radius = Math.min(Math.max(w, h) * 0.34, 360);
            if (d < radius) {
              dx /= d;
              dy /= d;
              const falloff = 1 - d / radius;
              const force = body.mass * falloff * falloff * 0.012;
              Matter.Body.applyForce(body, body.position, {
                x: dx * force,
                y: dy * force - force * 0.12,
              });
            }
          }
        }

        if (!freezePoster) Matter.Engine.update(engine, STEP_MS);
      }

      // ---- 渲染 ----
      ctx.clearRect(0, 0, w, h);
      if (trail.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1];
          const b = trail[i];
          const alpha = Math.max(0, Math.min(a.life, b.life)) * 0.42;
          ctx.strokeStyle = `rgba(15, 122, 85, ${alpha})`;
          ctx.lineWidth = Math.max(3, (a.size + b.size) * 0.45);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (attracting) {
        const radius = 54 - squeeze * 24;
        ctx.save();
        ctx.globalAlpha = 0.34 + squeeze * 0.32;
        ctx.strokeStyle = squeeze > 0.45 ? "#c8a24a" : "#0f7a55";
        ctx.lineWidth = 2 + squeeze * 2;
        ctx.beginPath();
        ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (activeRepelHand) {
        ctx.save();
        ctx.globalAlpha = 0.36;
        ctx.strokeStyle = "#8f304a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(activeRepelHand.x * w, activeRepelHand.y * h, 62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      for (const icon of icons) {
        const { body, size, texture } = icon;
        const drawSize = size * texture.ratio;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.drawImage(
          texture.canvas,
          -drawSize / 2,
          -drawSize / 2,
          drawSize,
          drawSize
        );
        ctx.restore();
      }
      for (const spark of sparks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, spark.life * 2.2));
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (posterTime > 0) {
        const alpha = Math.min(0.5, posterTime * 0.55);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 10;
        ctx.strokeRect(26, 26, Math.max(0, w - 52), Math.max(0, h - 52));
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = "#c8a24a";
        ctx.lineWidth = 2;
        ctx.strokeRect(38, 38, Math.max(0, w - 76), Math.max(0, h - 76));
        ctx.restore();
      }
    };
    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      step(now);
    };
    rafId = requestAnimationFrame(loop);

    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__scene = {
        icons,
        engine,
        frame: () => lastTime,
        tick: step, // 标签页隐藏（rAF 暂停）时可手动推进，用于自动化验证
        controls: () => controlsRef?.current,
        cooldowns: () => ({
          startup: startupCooldown,
          fling: flingCooldown,
          release: releaseCooldown,
          attracting,
          squeeze: +squeeze.toFixed(2),
        }),
      };
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      Matter.Engine.clear(engine);
      Matter.Composite.clear(engine.world, false);
    };
  }, [fontReady, palmRef, sceneStateRef, controlsRef]);

  return <canvas ref={canvasRef} className="scene-canvas" />;
}
