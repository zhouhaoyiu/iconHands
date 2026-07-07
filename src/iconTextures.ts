export interface IconTexture {
  canvas: HTMLCanvasElement;
  /** 贴图边长与图标边长的比值（含阴影留白） */
  ratio: number;
}

const BADGE_START = 0xe001;
const BADGE_COUNT = 0x137;

const PALETTES: Array<[string, string, string]> = [
  ["#102f26", "#c8a24a", "#f8faf4"],
  ["#18324f", "#d6b35a", "#f7fbff"],
  ["#5a1f2c", "#e1b84d", "#fff7f8"],
  ["#233876", "#b7c7e8", "#f6f8ff"],
  ["#24524a", "#9fd0c4", "#f5fbf9"],
  ["#6b2d1f", "#f0b75e", "#fff8f2"],
  ["#203447", "#a8d5e2", "#f4fbff"],
  ["#4b2434", "#cfa66a", "#fff9f6"],
];

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function makeIconTexture(index: number, renderSize = 128): IconTexture {
  const [primary, accent, paper] = PALETTES[index % PALETTES.length];
  const badge = String.fromCharCode(BADGE_START + (index % BADGE_COUNT));

  const pad = renderSize * 0.28;
  const full = renderSize + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = full;
  canvas.height = full;
  const ctx = canvas.getContext("2d")!;

  const x = pad;
  const y = pad;
  const radius = renderSize * 0.18;
  const center = pad + renderSize / 2;

  // Source: lovefc/china_school_badge, Apache-2.0. The font itself is kept in public/fonts.
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.26)";
  ctx.shadowBlur = renderSize * 0.16;
  ctx.shadowOffsetY = renderSize * 0.07;
  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.fillStyle = primary;
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.fillStyle = primary;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, renderSize * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineWidth = renderSize * 0.05;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.fillStyle = primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${renderSize * 0.72}px fc-icon`;
  ctx.fillText(badge, center, center + renderSize * 0.015);

  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = renderSize * 0.018;
  ctx.stroke();

  return { canvas, ratio: full / renderSize };
}
