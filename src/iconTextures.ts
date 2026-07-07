export interface IconTexture {
  canvas: HTMLCanvasElement;
  /** 贴图边长与图标边长的比值（含阴影留白） */
  ratio: number;
}

const BADGE_START = 0xe001;
const BADGE_COUNT = 0x137;

const COLORS = [
  "#102f26",
  "#18324f",
  "#5a1f2c",
  "#233876",
  "#24524a",
  "#6b2d1f",
  "#203447",
  "#4b2434",
];

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
  const primary = COLORS[index % COLORS.length];
  const badge = String.fromCharCode(BADGE_START + (index % BADGE_COUNT));

  const pad = renderSize * 0.28;
  const full = renderSize + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = full;
  canvas.height = full;
  const ctx = canvas.getContext("2d")!;

  const center = pad + renderSize / 2;

  ctx.fillStyle = primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${renderSize}px fc-icon`;
  const metrics = ctx.measureText(badge);
  const boxW = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const boxH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const target = renderSize * 1.02;
  const fontSize = renderSize * Math.min(target / (boxW || target), target / (boxH || target));

  // Source: lovefc/china_school_badge, Apache-2.0. The font itself is kept in public/fonts.
  ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
  ctx.shadowBlur = renderSize * 0.12;
  ctx.shadowOffsetY = renderSize * 0.05;
  fillCenteredGlyph(ctx, badge, center, center, fontSize);

  return { canvas, ratio: full / renderSize };
}
