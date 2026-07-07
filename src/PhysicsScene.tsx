import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { makeIconTexture, type IconTexture } from "./iconTextures";
import type { PalmSnapshot } from "./useHandTracking";

const DESKTOP_ICON_COUNT = 72;
const MOBILE_ICON_COUNT = 44;
const MIN_SIZE = 38;
const MAX_SIZE = 68;

/** 聚集弹簧刚度（accel = k * 距离，单位随 matter 内部积分） */
const SPRING_K = 2.6e-6;
/** 环绕切向力 */
const SWIRL_K = 3.2e-4;
/** 聚集时的最大速度（px/frame） */
const MAX_ATTRACT_SPEED = 26;
const RELEASE_BURST_SPEED = 34;

interface IconBody {
  body: Matter.Body;
  size: number;
  texture: IconTexture;
  /** 围绕手掌的目标偏移（极坐标，缓慢公转） */
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
}

export interface SceneDebugState {
  attracting: boolean;
  targetX: number;
  targetY: number;
  /** 手掌移动速度（px/s，平滑后） */
  palmSpeed: number;
  /** 刚甩出（冷却期内） */
  flung: boolean;
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
  pushY = 0
) {
  for (const icon of icons) {
    const { body } = icon;
    body.collisionFilter.group = 0;
    let dx = body.position.x - x;
    let dy = body.position.y - y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const tangent = Math.random() < 0.5 ? -1 : 1;
    const jitter = 0.75 + Math.random() * 0.65;
    Matter.Body.setVelocity(body, {
      x: dx * speed * jitter + -dy * speed * 0.28 * tangent + pushX,
      y: dy * speed * jitter + dx * speed * 0.28 * tangent + pushY - speed * 0.25,
    });
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.95);
  }
}

export default function PhysicsScene({
  palmRef,
  sceneStateRef,
  controlsRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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
    let prevPointerActive = pointer.active;
    let palmVelX = 0;
    let palmVelY = 0;
    let fistRecent = 0; // 松手判定窗口（秒）
    let flingCooldown = 0; // 抛出后的冷却（秒），期间不吸引
    let releaseCooldown = 0; // 正常松手落下后的短冷却（秒），让下落有承诺感
    let startupCooldown = forcedAttract ? 0 : 2.5; // 开场冷却（秒）：让初始的图标雨自然落完
    let accMs = 0; // 固定步长物理的时间累加器（与屏幕刷新率解耦）
    const target = { x: w / 2, y: h * 0.45 }; // 平滑后的聚集点
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dtSec = Math.min((now - lastTime) / 1000, 1 / 24);
      lastTime = now;

      const palm = palmRef.current;
      const fistNow = palm.detected && palm.fist;
      const handPresent =
        (palm.detected && (palm.facing || palm.fist)) || pointer.active;
      const rawX = (pointer.active ? pointer.x : palm.x) * w;
      const rawY = (pointer.active ? pointer.y : palm.y) * h;
      const pointerReleased = prevPointerActive && !pointer.active;

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

      startupCooldown = Math.max(0, startupCooldown - dtSec);
      flingCooldown = Math.max(0, flingCooldown - dtSec);
      releaseCooldown = Math.max(0, releaseCooldown - dtSec);

      // ---- 抛出：按 hwang 原逻辑，握住/吸住后松开才散开 ----
      const throwSpeed = Math.max(w, h) * 0.9;
      const releasedGrip =
        attracting && fistRecent > 0 && !fistNow && squeeze > 0.35;
      if (
        (releasedGrip || (attracting && pointerReleased)) &&
        flingCooldown === 0
      ) {
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
          dirY * throwV
        );
        flingCooldown = 1.2;
        releaseCooldown = 0.2;
        attracting = false;
        facingTime = 0;
        fistRecent = 0;
        squeeze = 0;
      }
      fistRecent = fistNow ? 0.13 : Math.max(0, fistRecent - dtSec);

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
      prevPointerActive = pointer.active;

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
        };
      }

      // ---- 固定 60Hz 步长推进物理，与屏幕刷新率解耦（120Hz 屏不再快一倍） ----
      const stackable = squeeze > 0.55;
      const STEP_MS = 1000 / 60;
      const SUB = 1 / 60;
      accMs = Math.min(accMs + dtSec * 1000, STEP_MS * 3); // 防积压
      while (accMs >= STEP_MS - 0.01) {
        accMs -= STEP_MS;
        for (const icon of icons) {
          const { body } = icon;
          body.frictionAir = attracting ? 0.05 + 0.04 * squeeze : 0.012;
          body.collisionFilter.group = stackable ? -1 : 0;

          if (attracting) {
            icon.orbitAngle += icon.orbitSpeed * SUB;
            // 挤压时聚集半径收紧到 15%，弹簧刚度放大；distance 控制整体远近
            const distance = controlsRef?.current.distance ?? 1;
            const radius = Math.max(
              icon.orbitRadius * distance * (1 - 0.85 * squeeze),
              10
            );
            const k = SPRING_K * (1 + 4 * squeeze);
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
        }

        Matter.Engine.update(engine, STEP_MS);
      }

      // ---- 渲染 ----
      ctx.clearRect(0, 0, w, h);
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
  }, [palmRef, sceneStateRef, controlsRef]);

  return <canvas ref={canvasRef} className="scene-canvas" />;
}
