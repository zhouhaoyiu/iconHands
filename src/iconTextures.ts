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

function fillCenteredGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  cx: number,
  cy: number,
  fontSize: number
) {
  ctx.font = `${fontSize}px fc-icon`;
  const metrics = ctx.measureText(glyph);
  const dx =
    (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
  const dy =
    (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  ctx.fillText(glyph, cx + dx, cy + dy);
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
  const radius = renderSize * 0.16;
  const center = pad + renderSize / 2;

  // Source: lovefc/china_school_badge, Apache-2.0. The font itself is kept in public/fonts.
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.26)";
  ctx.shadowBlur = renderSize * 0.16;
  ctx.shadowOffsetY = renderSize * 0.07;
  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.fillStyle = paper;
  ctx.fill();

  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.lineWidth = renderSize * 0.035;
  ctx.strokeStyle = primary;
  ctx.stroke();

  ctx.fillStyle = primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${renderSize}px fc-icon`;
  const metrics = ctx.measureText(badge);
  const boxW = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const boxH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const target = renderSize * 0.9;
  const fontSize = renderSize * Math.min(target / (boxW || target), target / (boxH || target));
  fillCenteredGlyph(ctx, badge, center, center, fontSize);

  roundedRect(ctx, x, y, renderSize, renderSize, radius);
  ctx.strokeStyle = accent;
  ctx.lineWidth = renderSize * 0.012;
  ctx.stroke();

  return { canvas, ratio: full / renderSize };
}
