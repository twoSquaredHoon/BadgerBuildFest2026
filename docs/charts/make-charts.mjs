// Draws the README charts as SVG (rounded bars, transparent background, same layout for every chart).
// Run: node docs/charts/make-charts.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL(".", import.meta.url));
const ORANGE = "#C2410C";
const GREEN = "#2E6A4E";
const GREY = "#8A8F87";

// Shared layout so bars start at the same x in every chart.
const W = 720, LABEL_W = 250, GAP = 14, BAR_H = 34, ROW = 52, TITLE_H = 44, PAD = 8, RADIUS = 8;
const MAX_W = W - LABEL_W - GAP - PAD;

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function chart({ file, title, color, rows }) {
  const h = TITLE_H + rows.length * ROW + PAD;
  const x0 = LABEL_W + GAP;
  const bars = rows.map(([label, value], i) => {
    const y = TITLE_H + i * ROW;
    const w = Math.max((value / 100) * MAX_W, RADIUS * 2);
    const inside = w > 60;
    return `
  <text x="${LABEL_W}" y="${y + BAR_H / 2}" text-anchor="end" dominant-baseline="central" class="label">${esc(label)}</text>
  <rect x="${x0}" y="${y}" width="${w.toFixed(1)}" height="${BAR_H}" rx="${RADIUS}" fill="${color}"/>
  <text x="${inside ? x0 + w - 12 : x0 + w + 10}" y="${y + BAR_H / 2}" text-anchor="${inside ? "end" : "start"}" dominant-baseline="central" class="value" fill="${inside ? "#FFFFFF" : color}">${value}%</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(title)}">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    .title { font-size: 18px; font-weight: 600; fill: ${GREY}; }
    .label { font-size: 15px; fill: ${GREY}; }
    .value { font-size: 17px; font-weight: 700; }
  </style>
  <text x="${x0}" y="22" class="title">${esc(title)}</text>${bars}
</svg>
`;
  writeFileSync(`${OUT}${file}`, svg);
  console.log("wrote", file);
}

chart({
  file: "owners.svg",
  title: "Pet owners and the cost of care",
  color: ORANGE,
  rows: [["Skipped or declined care", 52], ["Cost was the reason", 71], ["No cheaper option offered", 73], ["Pet got worse or died", 14]]
});
chart({
  file: "vets-timing.svg",
  title: "When vets bring up the client's finances",
  color: GREEN,
  rows: [["Before recommending", 17], ["After recommending", 49], ["Only if the client asks", 34]]
});
chart({
  file: "vets-say.svg",
  title: "What vets say",
  color: GREEN,
  rows: [["Finances limit the care", 94], ["Declined care hurts the team", 76], ["No training on cost talks", 48]]
});
