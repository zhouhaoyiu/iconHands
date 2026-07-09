export interface IconTexture {
  canvas: HTMLCanvasElement;
  /** 贴图边长与图标边长的比值（含阴影留白） */
  ratio: number;
}

const BADGE_START = 0xe001;
const BADGE_COUNT = 0x137;

const FALLBACK_COLORS = [
  "#102f26",
  "#18324f",
  "#6f2c3f",
  "#24524a",
  "#7a4b20",
];

// 字体库只提供单色字形；这里按公开校徽主视觉整理展示色，不作为学校官方 VI 色值。
const SCHOOL_PRIMARY_COLORS: Record<number, string> = {
  0: "#1f6f5f", // ncu
  1: "#8a4b2b", // jci
  2: "#6f2c8f", // nju
  3: "#82318e", // tsinghua
  4: "#94070a", // pku
  5: "#1f4f8f", // ahu
  6: "#003f7d", // xmu
  7: "#1d5f9f", // ujs
  8: "#005bac", // zju
  9: "#c00000", // scu
  10: "#1d4f8f", // henu
  11: "#2c6b55", // hbu
  12: "#005bac", // neu
  13: "#1f4f8f", // shu
  14: "#003d79", // cqu
  15: "#8a1f2d", // cdu
  16: "#1f5f8f", // hubu
  17: "#b40000", // sdu
  18: "#1d4f8f", // sxu
  19: "#006633", // sysu
  20: "#003b7a", // tju
  21: "#7a1e55", // ynu
  22: "#b21f2d", // hnu
  23: "#1f5f9f", // qhu
  24: "#236b42", // gzu
  25: "#8a1f2d", // utibet
  26: "#1f4f8f", // lzu
  27: "#1f5f9f", // imu
  28: "#1f5f8f", // xju
  29: "#005bac", // fzu
  30: "#005bac", // jlu
  31: "#003f7d", // hit
  32: "#1f4f8f", // whu
  33: "#236b42", // nxu
  34: "#b01e23", // sjtu
  35: "#0055a2", // fudan
  36: "#b21f2d", // ustc
  37: "#4b2c83", // seu
  38: "#003d7c", // xjtu
  39: "#1f4f8f", // snnu
  40: "#005a9c", // cumt
  41: "#8c1515", // ruc
  42: "#1f6b3a", // cau
  43: "#8a1f2d", // cuc
  44: "#8a1538", // cupl
  45: "#1f4f8f", // cufe
  46: "#8a1f2d", // muc
  47: "#005bac", // tongji
  48: "#1f4f8f", // bnu
  49: "#1f5f9f", // suda
  50: "#005bac", // buaa
  51: "#005bac", // dlut
  52: "#8a1f2d", // bit
  53: "#1f4f8f", // nwpu
  54: "#8a1f2d", // ecnu
  55: "#1f5f8f", // cug
  56: "#b21f2d", // ecust
  57: "#1f4f8f", // zzu
  58: "#005bac", // nuaa
  59: "#1f6b3a", // njau
  60: "#005bac", // uestc
  61: "#1f6b3a", // nwsuaf
  62: "#1f6b3a", // swu
  63: "#1f4f8f", // whut
  64: "#8a1f2d", // njust
  65: "#1f4f8f", // ustb
  66: "#1f6b55", // jiangnan
  67: "#b21f2d", // buct
  68: "#1f4f8f", // ccnu
  69: "#1f6b3a", // hzau
  70: "#1f4f8f", // njnu
  71: "#1f4f8f", // xidian
  72: "#1f5f9f", // hhu
  73: "#8a1f2d", // jnu
  74: "#8a1f2d", // bjtu
  75: "#1f4f8f", // ncepu
  76: "#1f4f8f", // nenu
  77: "#1f5f9f", // zjut
  78: "#1f5f8f", // yzu
  79: "#1f5f8f", // ccmu
  80: "#1f4f8f", // scnu
  81: "#1f4f8f", // hfut
  82: "#8a1f2d", // njtech
  83: "#8a1f2d", // nwu
  84: "#1f5f8f", // usst
  85: "#7a4b20", // dhu
  86: "#1f4f8f", // bupt
  87: "#1f5f8f", // upc
  88: "#1f5f8f", // cup
  89: "#1f5f8f", // nuist
  90: "#1f6b3a", // scau
  91: "#1f5f9f", // nbu
  92: "#8a1f2d", // zuel
  93: "#1f6b3a", // bjfu
  94: "#1f5f8f", // cmu
  95: "#1f5f8f", // zjnu
};

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
  const badgeIndex = index % BADGE_COUNT;
  const primary =
    SCHOOL_PRIMARY_COLORS[badgeIndex] ??
    FALLBACK_COLORS[badgeIndex % FALLBACK_COLORS.length];
  const badge = String.fromCharCode(BADGE_START + badgeIndex);

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
