/**
 * 圆角矩形 app 图标贴图，阴影直接烘焙进贴图。
 * 首选 icon.museum 的真实 app 图标（makeImageIconTexture），
 * 图片加载完成前用渐变 + emoji 的占位贴图（makeIconTexture）。
 */

export interface IconTexture {
  canvas: HTMLCanvasElement;
  /** 贴图边长与图标边长的比值（含阴影留白） */
  ratio: number;
}

const PALETTES: Array<[string, string]> = [
  ["#5AC8FA", "#007AFF"],
  ["#FF9F0A", "#FF375F"],
  ["#BF5AF2", "#5E5CE6"],
  ["#34C759", "#30B0C7"],
  ["#FFD60A", "#FF9F0A"],
  ["#64D2FF", "#5E5CE6"],
  ["#FF6482", "#FF375F"],
  ["#30D158", "#248A3D"],
  ["#FDA4AF", "#FB7185"],
  ["#7AA2FF", "#3B5BDB"],
  ["#FFB86B", "#F76707"],
  ["#66D9E8", "#0CA678"],
];

const GLYPHS = [
  "📷", "🎧", "💬", "🗺️", "🎮", "✉️", "🎵", "☀️", "📚", "🧭",
  "💡", "⏰", "🌈", "🍊", "🫧", "📝", "🎨", "📈", "🔍", "🛰️",
  "🎬", "🧩", "⚽", "🚀", "🌙", "🍀", "🔔", "🧠",
];

/** 用真实 app 图标图片生成贴图：圆角裁剪 + 烘焙阴影 + 内描边 */
export function makeImageIconTexture(
  img: HTMLImageElement,
  renderSize = 128
): IconTexture {
  const pad = renderSize * 0.28;
  const full = renderSize + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = full;
  canvas.height = full;
  const ctx = canvas.getContext("2d")!;

  const radius = renderSize * 0.22;
  const roundedRect = () => {
    ctx.beginPath();
    ctx.roundRect(pad, pad, renderSize, renderSize, radius);
  };

  // 阴影打底
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
  ctx.shadowBlur = renderSize * 0.16;
  ctx.shadowOffsetY = renderSize * 0.07;
  roundedRect();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();

  // 圆角裁剪后铺图
  ctx.save();
  roundedRect();
  ctx.clip();
  ctx.drawImage(img, pad, pad, renderSize, renderSize);
  ctx.restore();

  // 内描边，让边缘更干净
  roundedRect();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = renderSize * 0.015;
  ctx.stroke();

  return { canvas, ratio: full / renderSize };
}

export function makeIconTexture(index: number, renderSize = 128): IconTexture {
  const palette = PALETTES[index % PALETTES.length];
  const glyph = GLYPHS[index % GLYPHS.length];

  const pad = renderSize * 0.28;
  const full = renderSize + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = full;
  canvas.height = full;
  const ctx = canvas.getContext("2d")!;

  const radius = renderSize * 0.22;
  const roundedRect = () => {
    ctx.beginPath();
    ctx.roundRect(pad, pad, renderSize, renderSize, radius);
  };

  // 先用带阴影的纯色打底，再叠渐变（shadow 只烘焙一次）
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
  ctx.shadowBlur = renderSize * 0.16;
  ctx.shadowOffsetY = renderSize * 0.07;
  roundedRect();
  ctx.fillStyle = palette[1];
  ctx.fill();
  ctx.restore();

  const grad = ctx.createLinearGradient(0, pad, 0, pad + renderSize);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(1, palette[1]);
  roundedRect();
  ctx.fillStyle = grad;
  ctx.fill();

  // 顶部玻璃高光
  ctx.save();
  roundedRect();
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, pad, 0, pad + renderSize * 0.55);
  gloss.addColorStop(0, "rgba(255,255,255,0.38)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(pad, pad, renderSize, renderSize * 0.55);
  ctx.restore();

  // 内描边
  roundedRect();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = renderSize * 0.02;
  ctx.stroke();

  // emoji 字形
  ctx.font = `${renderSize * 0.5}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, pad + renderSize / 2, pad + renderSize * 0.54);

  return { canvas, ratio: full / renderSize };
}
