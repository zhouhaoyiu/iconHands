export interface IconTexture {
  canvas: HTMLCanvasElement;
  /** 贴图边长与图标边长的比值（含阴影留白） */
  ratio: number;
}

const PALETTES: Array<[string, string, string]> = [
  ["#0f3d2e", "#c8a24a", "#f8faf8"],
  ["#17324d", "#d6b35a", "#f7fbff"],
  ["#5a1f2c", "#e1b84d", "#fff7f8"],
  ["#233876", "#b7c7e8", "#f6f8ff"],
  ["#3d2a73", "#d9b64f", "#faf7ff"],
  ["#24524a", "#9fd0c4", "#f5fbf9"],
  ["#6b2d1f", "#f0b75e", "#fff8f2"],
  ["#203447", "#a8d5e2", "#f4fbff"],
  ["#132b3a", "#d09b42", "#f8faf7"],
  ["#4b2434", "#cfa66a", "#fff9f6"],
  ["#153b54", "#91c7d9", "#f4fbfd"],
  ["#2d4d32", "#d7c46a", "#fbfbef"],
  ["#412c5f", "#c7b7e8", "#faf8ff"],
  ["#50311f", "#e7c08a", "#fff8ed"],
  ["#0f4b5a", "#9ed3c8", "#f4fbfa"],
  ["#2b395f", "#e0c45a", "#f9f8ef"],
  ["#6a2537", "#e7b9c5", "#fff7f9"],
  ["#1d4b40", "#d2a642", "#f7fbf7"],
  ["#26384a", "#b6c4d8", "#f6f9fc"],
  ["#5b3a21", "#f1c46e", "#fff8ed"],
  ["#224a76", "#d0b05a", "#f6f9ff"],
  ["#3c5148", "#d6d0a8", "#fbfbf3"],
  ["#4f2d64", "#e4c36b", "#fbf7ff"],
  ["#1b5a4f", "#a7d8ce", "#f4fbf8"],
];

const SCHOOLS: Array<[string, string, string]> = [
  ["AURORA", "AU", "1856"],
  ["PACIFIC", "PU", "1891"],
  ["SUMMIT", "SU", "1912"],
  ["RIVER", "RU", "1888"],
  ["NOVA", "NU", "1964"],
  ["HARBOR", "HU", "1907"],
  ["METRO", "MU", "1935"],
  ["CEDAR", "CU", "1874"],
  ["MERIDIAN", "ME", "1902"],
  ["NORTHRIDGE", "NR", "1898"],
  ["LAKESIDE", "LU", "1919"],
  ["EASTGATE", "EG", "1927"],
  ["SILVER", "SU", "1881"],
  ["REDWOOD", "RU", "1869"],
  ["ALPINE", "AL", "1904"],
  ["COASTAL", "CO", "1931"],
  ["TERRA", "TU", "1958"],
  ["UNITY", "UN", "1921"],
  ["SKYLINE", "SK", "1972"],
  ["GRAND", "GU", "1886"],
  ["WESTFIELD", "WU", "1916"],
  ["BAYVIEW", "BV", "1948"],
  ["HIGHLAND", "HI", "1879"],
  ["RIDGE", "RI", "1938"],
  ["FOREST", "FO", "1895"],
  ["STONE", "ST", "1909"],
  ["GATEWAY", "GW", "1961"],
  ["PIONEER", "PI", "1883"],
  ["ORCHARD", "OR", "1924"],
  ["MARINER", "MA", "1901"],
  ["ATLAS", "AT", "1952"],
  ["LYCEUM", "LY", "1871"],
  ["PRAIRIE", "PR", "1933"],
  ["CANYON", "CA", "1968"],
  ["BROOK", "BR", "1890"],
  ["CRESCENT", "CR", "1915"],
  ["NEWTON", "NW", "1942"],
  ["KINGSTON", "KG", "1889"],
  ["ROSEDALE", "RD", "1929"],
  ["WINDWARD", "WI", "1976"],
];

const MOTIFS = [
  "book",
  "torch",
  "dome",
  "atom",
  "star",
  "wave",
  "mountain",
  "compass",
  "leaf",
  "gear",
  "scale",
  "ship",
  "scope",
  "bridge",
  "lyre",
  "rocket",
  "sun",
  "tower",
  "seed",
  "shield",
];

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight = 800
) {
  do {
    ctx.font = `${weight} ${size}px ui-serif, Georgia, serif`;
    size -= 1;
  } while (ctx.measureText(text).width > maxWidth && size > 7);
  ctx.fillText(text, x, y);
}

function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  motif: string,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (motif === "book") {
    ctx.strokeRect(cx - size * 0.45, cy - size * 0.25, size * 0.38, size * 0.5);
    ctx.strokeRect(cx + size * 0.07, cy - size * 0.25, size * 0.38, size * 0.5);
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.28);
    ctx.lineTo(cx, cy + size * 0.28);
    ctx.stroke();
  } else if (motif === "torch") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.bezierCurveTo(cx - size * 0.28, cy - size * 0.2, cx, cy, cx, cy + size * 0.03);
    ctx.bezierCurveTo(cx + size * 0.28, cy - size * 0.2, cx + size * 0.06, cy - size * 0.35, cx, cy - size * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.05);
    ctx.lineTo(cx, cy + size * 0.5);
    ctx.moveTo(cx - size * 0.22, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.22, cy + size * 0.5);
    ctx.stroke();
  } else if (motif === "dome") {
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.08, size * 0.36, Math.PI, 0);
    ctx.lineTo(cx + size * 0.36, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.36, cy + size * 0.12);
    ctx.closePath();
    ctx.stroke();
    for (const dx of [-0.24, 0, 0.24]) {
      ctx.beginPath();
      ctx.moveTo(cx + size * dx, cy + size * 0.14);
      ctx.lineTo(cx + size * dx, cy + size * 0.48);
      ctx.stroke();
    }
  } else if (motif === "atom") {
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.48, size * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === "star") {
    starPath(ctx, cx, cy, size * 0.45, size * 0.2);
    ctx.fill();
  } else if (motif === "wave") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.48, cy);
    ctx.bezierCurveTo(cx - size * 0.2, cy - size * 0.35, cx + size * 0.2, cy + size * 0.35, cx + size * 0.48, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.42, cy + size * 0.22);
    ctx.bezierCurveTo(cx - size * 0.16, cy - size * 0.06, cx + size * 0.14, cy + size * 0.48, cx + size * 0.42, cy + size * 0.2);
    ctx.stroke();
  } else if (motif === "mountain") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.48, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.12, cy - size * 0.34);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.06);
    ctx.lineTo(cx + size * 0.24, cy - size * 0.22);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.42);
    ctx.closePath();
    ctx.stroke();
  } else if (motif === "leaf") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.28, size * 0.48, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.24, cy + size * 0.32);
    ctx.lineTo(cx + size * 0.28, cy - size * 0.28);
    ctx.stroke();
  } else if (motif === "gear") {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(a) * size * 0.36, cy + Math.sin(a) * size * 0.36);
      ctx.lineTo(cx + Math.cos(a) * size * 0.5, cy + Math.sin(a) * size * 0.5);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === "scale") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.42);
    ctx.lineTo(cx, cy + size * 0.34);
    ctx.moveTo(cx - size * 0.34, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.34, cy - size * 0.2);
    ctx.moveTo(cx - size * 0.34, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.46, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.22, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.34, cy - size * 0.2);
    ctx.moveTo(cx + size * 0.34, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.46, cy + size * 0.12);
    ctx.lineTo(cx + size * 0.22, cy + size * 0.12);
    ctx.lineTo(cx + size * 0.34, cy - size * 0.2);
    ctx.moveTo(cx - size * 0.22, cy + size * 0.36);
    ctx.lineTo(cx + size * 0.22, cy + size * 0.36);
    ctx.stroke();
  } else if (motif === "ship") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.48, cy + size * 0.12);
    ctx.lineTo(cx + size * 0.42, cy + size * 0.12);
    ctx.lineTo(cx + size * 0.22, cy + size * 0.34);
    ctx.lineTo(cx - size * 0.32, cy + size * 0.34);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.06, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.06, cy - size * 0.42);
    ctx.lineTo(cx + size * 0.28, cy - size * 0.02);
    ctx.closePath();
    ctx.stroke();
  } else if (motif === "scope") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, cy + size * 0.34);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.34);
    ctx.moveTo(cx + size * 0.2, cy - size * 0.42);
    ctx.lineTo(cx + size * 0.44, cy - size * 0.24);
    ctx.moveTo(cx - size * 0.32, cy + size * 0.36);
    ctx.lineTo(cx + size * 0.28, cy + size * 0.36);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.34, cy - size * 0.32, size * 0.13, size * 0.2, -0.9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (motif === "bridge") {
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.28, size * 0.42, Math.PI, 0);
    ctx.moveTo(cx - size * 0.5, cy + size * 0.28);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.28);
    for (const dx of [-0.32, -0.12, 0.12, 0.32]) {
      ctx.moveTo(cx + size * dx, cy + size * 0.06);
      ctx.lineTo(cx + size * dx, cy + size * 0.38);
    }
    ctx.stroke();
  } else if (motif === "lyre") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.36, cy - size * 0.38);
    ctx.bezierCurveTo(cx - size * 0.5, cy, cx - size * 0.24, cy + size * 0.38, cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx + size * 0.24, cy + size * 0.38, cx + size * 0.5, cy, cx + size * 0.36, cy - size * 0.38);
    ctx.moveTo(cx - size * 0.28, cy - size * 0.22);
    ctx.lineTo(cx + size * 0.28, cy - size * 0.22);
    for (const dx of [-0.18, -0.06, 0.06, 0.18]) {
      ctx.moveTo(cx + size * dx, cy - size * 0.22);
      ctx.lineTo(cx + size * dx, cy + size * 0.24);
    }
    ctx.stroke();
  } else if (motif === "rocket") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.48);
    ctx.bezierCurveTo(cx - size * 0.24, cy - size * 0.22, cx - size * 0.22, cy + size * 0.18, cx, cy + size * 0.42);
    ctx.bezierCurveTo(cx + size * 0.22, cy + size * 0.18, cx + size * 0.24, cy - size * 0.22, cx, cy - size * 0.48);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.12, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === "sun") {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(a) * size * 0.32, cy + Math.sin(a) * size * 0.32);
      ctx.lineTo(cx + Math.cos(a) * size * 0.48, cy + Math.sin(a) * size * 0.48);
    }
    ctx.stroke();
  } else if (motif === "tower") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.26, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.16, cy - size * 0.32);
    ctx.lineTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.16, cy - size * 0.32);
    ctx.lineTo(cx + size * 0.26, cy + size * 0.42);
    ctx.moveTo(cx - size * 0.24, cy + size * 0.16);
    ctx.lineTo(cx + size * 0.24, cy + size * 0.16);
    ctx.moveTo(cx - size * 0.18, cy - size * 0.12);
    ctx.lineTo(cx + size * 0.18, cy - size * 0.12);
    ctx.stroke();
  } else if (motif === "seed") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.42);
    ctx.lineTo(cx, cy - size * 0.34);
    ctx.moveTo(cx, cy - size * 0.06);
    ctx.bezierCurveTo(cx - size * 0.34, cy - size * 0.3, cx - size * 0.48, cy + size * 0.04, cx, cy + size * 0.1);
    ctx.moveTo(cx, cy - size * 0.16);
    ctx.bezierCurveTo(cx + size * 0.34, cy - size * 0.4, cx + size * 0.48, cy - size * 0.02, cx, cy + size * 0.04);
    ctx.stroke();
  } else if (motif === "shield") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.46);
    ctx.lineTo(cx + size * 0.4, cy - size * 0.26);
    ctx.lineTo(cx + size * 0.32, cy + size * 0.2);
    ctx.lineTo(cx, cy + size * 0.48);
    ctx.lineTo(cx - size * 0.32, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.4, cy - size * 0.26);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.16, cy - size * 0.08);
    ctx.lineTo(cx + size * 0.5, cy);
    ctx.lineTo(cx + size * 0.16, cy + size * 0.08);
    ctx.lineTo(cx, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.16, cy + size * 0.08);
    ctx.lineTo(cx - size * 0.5, cy);
    ctx.lineTo(cx - size * 0.16, cy - size * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function makeIconTexture(index: number, renderSize = 128): IconTexture {
  const [primary, accent, paper] = PALETTES[index % PALETTES.length];
  const [school, initials, year] = SCHOOLS[index % SCHOOLS.length];
  const motif = MOTIFS[index % MOTIFS.length];

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

  // ponytail: 自绘虚构校徽，避免打包真实大学商标。
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
  ctx.shadowBlur = renderSize * 0.16;
  ctx.shadowOffsetY = renderSize * 0.07;
  roundedRect();
  ctx.fillStyle = primary;
  ctx.fill();
  ctx.restore();

  roundedRect();
  ctx.fillStyle = primary;
  ctx.fill();

  const sealX = pad + renderSize / 2;
  const sealY = pad + renderSize / 2;
  const sealR = renderSize * 0.38;

  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineWidth = renderSize * 0.055;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = renderSize * 0.018;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
  ctx.stroke();

  ctx.fillStyle = primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, school, sealX, sealY - sealR * 0.55, sealR * 1.25, renderSize * 0.13);
  fitText(ctx, year, sealX, sealY + sealR * 0.58, sealR * 0.82, renderSize * 0.12, 700);

  ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
  fitText(ctx, initials, sealX, sealY + renderSize * 0.02, sealR * 1.2, renderSize * 0.38, 900);
  drawMotif(ctx, motif, sealX, sealY, renderSize * 0.34, primary);

  ctx.fillStyle = accent;
  for (const dx of [-0.52, 0.52]) {
    ctx.beginPath();
    ctx.arc(sealX + sealR * dx, sealY, renderSize * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  roundedRect();
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, pad, 0, pad + renderSize * 0.5);
  gloss.addColorStop(0, "rgba(255,255,255,0.22)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(pad, pad, renderSize, renderSize * 0.5);
  ctx.restore();

  roundedRect();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = renderSize * 0.018;
  ctx.stroke();

  return { canvas, ratio: full / renderSize };
}
