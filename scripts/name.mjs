// Writes assets/name-light.svg and assets/name-dark.svg: "krezio" written on graph
// paper by a chain of circles turning at fixed speeds, the same way the name is
// drawn on my site. It loops: the circles write the word, fade, and start again.
//
//   node scripts/name.mjs
//
// data/name-krezio.json holds the Fourier coefficients c_k of one closed curve
// z(t) = sum c_k exp(2 pi i k t), made by the portfolio's tools/build_name.py. The
// curve is parametrised by arc length, so drawing each pen stroke at a constant
// speed keeps the ink in step with the tip of the circles.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const W = 1000;
const H = 280;
const NAME_H = 200;       // height of the word, in px
const SAMPLES = 2400;
const CHAIN = 120;        // frequencies in the circle chain (2 circles each)
const T = 8;              // seconds for the circles to go round once
const CYCLE = 2 * T;      // write for T, then hold and fade before the next loop

const THEMES = {
  light: { paper: "#eef3e7", grid: "#d6e2cf", major: "#b9d0b2", axis: "#1d2c23", pen: "#c32f18", circle: "#2c5a44" },
  dark: { paper: "#111e19", grid: "#1c2f27", major: "#2b4539", axis: "#dfe8da", pen: "#ff8a70", circle: "#8fd0ad" },
};

const data = JSON.parse(await readFile(new URL("../data/name-krezio.json", import.meta.url), "utf8"));
const K = data.terms;
const coef = (k) => [data.coeffs[2 * (k + K)], data.coeffs[2 * (k + K) + 1]];
const lifted = (t) => data.lifted.some(([a, b]) => t >= a && t < b);

// the curve with every term, sampled evenly in t
const pts = [];
for (let j = 0; j <= SAMPLES; j++) {
  const t = j / SAMPLES;
  let x = 0;
  let y = 0;
  for (let k = -K; k <= K; k++) {
    const [a, b] = coef(k);
    const c = Math.cos(2 * Math.PI * k * t);
    const s = Math.sin(2 * Math.PI * k * t);
    x += a * c - b * s;
    y += a * s + b * c;
  }
  pts.push({ t, x, y, down: !lifted(t) });
}

// fit the word into the middle of the banner
const drawn = pts.filter((p) => p.down);
const minX = Math.min(...drawn.map((p) => p.x));
const maxX = Math.max(...drawn.map((p) => p.x));
const minY = Math.min(...drawn.map((p) => p.y));
const maxY = Math.max(...drawn.map((p) => p.y));
const scale = NAME_H / (maxY - minY);
const ox = (W - scale * (maxX - minX)) / 2 - scale * minX;
const oy = (H - scale * (maxY - minY)) / 2 - scale * minY;
const X = (x) => ox + x * scale;
const Y = (y) => oy + y * scale;
const f = (v) => (Math.round(v * 10) / 10).toString();

// one path per pen stroke, each drawn over its own slice of t
const strokes = [];
let cur = null;
for (const p of pts) {
  if (p.down) {
    const x = X(p.x);
    const y = Y(p.y);
    if (!cur) {
      cur = { t0: p.t, t1: p.t, d: `M${f(x)} ${f(y)}`, len: 0, last: [x, y] };
      strokes.push(cur);
    } else {
      cur.d += `L${f(x)} ${f(y)}`;
      cur.len += Math.hypot(x - cur.last[0], y - cur.last[1]);
      cur.last = [x, y];
      cur.t1 = p.t;
    }
  } else {
    cur = null;
  }
}

const pct = (t) => `${((t * T) / CYCLE) * 100}%`.replace(/(\.\d{2})\d+%$/, "$1%");

function inkCss() {
  let css = "";
  strokes.forEach((s, i) => {
    const L = Math.ceil(s.len) + 1;
    css += `.s${i}{stroke-dasharray:${L};stroke-dashoffset:${L};animation:w${i} ${CYCLE}s linear infinite}`;
    css += `@keyframes w${i}{0%,${pct(s.t0)}{stroke-dashoffset:${L};opacity:1}${pct(s.t1)}{stroke-dashoffset:0}92%{opacity:1;stroke-dashoffset:0}99.9%{opacity:0;stroke-dashoffset:0}100%{opacity:0;stroke-dashoffset:${L}}}`;
  });
  return css;
}

// the circles: frequencies 1, -1, 2, -2, ... nested so each turns relative to the last
function chain() {
  const terms = [];
  for (let m = 1; m <= CHAIN; m++) for (const k of [m, -m]) terms.push(k);
  const deg = (k) => (Math.atan2(coef(k)[1], coef(k)[0]) * 180) / Math.PI;
  const [a0, b0] = coef(0);
  let out = `<g transform="translate(${f(X(a0))} ${f(Y(b0))})">`;
  let close = "</g>";
  let prevK = 0;
  let prevPhase = 0;
  for (const k of terms) {
    const [a, b] = coef(k);
    const r = Math.hypot(a, b) * scale;
    const phase = deg(k);
    const from = phase - prevPhase;
    const to = from + 360 * (k - prevK);
    const ring = r > 0.8 ? `<circle r="${f(r)}"/>` : "";
    out += `<g><animateTransform attributeName="transform" type="rotate" from="${f(from)}" to="${f(to)}" dur="${T}s" repeatCount="indefinite"/>${ring}<line x2="${f(r)}"/><g transform="translate(${f(r)} 0)">`;
    close = "</g></g>" + close;
    prevK = k;
    prevPhase = phase;
  }
  return out + `<circle class="tip" r="4.5"/>` + close;
}

function svg(theme) {
  const c = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="krezio, written by circles">
<title>krezio</title>
<defs>
<pattern id="minor" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="${c.grid}"/></pattern>
<pattern id="major" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#minor)"/><path d="M100 0H0V100" fill="none" stroke="${c.major}"/></pattern>
<clipPath id="box"><rect width="${W}" height="${H}"/></clipPath>
</defs>
<style>
.ink path{fill:none;stroke:${c.pen};stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}
${inkCss()}
.chain{fill:none;stroke:${c.circle};stroke-width:1;animation:fade ${CYCLE}s linear infinite}
.chain line{stroke:${c.axis};stroke-opacity:.7}
.chain circle{stroke-opacity:.55}
.chain .tip{fill:${c.pen};stroke:none}
@keyframes fade{0%{opacity:0}2%,50%{opacity:1}58%,98%{opacity:0}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.ink path{animation:none!important;stroke-dashoffset:0!important}.chain{display:none}}
</style>
<rect width="${W}" height="${H}" fill="${c.paper}"/>
<rect width="${W}" height="${H}" fill="url(#major)"/>
<g clip-path="url(#box)">
<g class="ink">${strokes.map((s, i) => `<path class="s${i}" d="${s.d}"/>`).join("")}</g>
<g class="chain">${chain()}</g>
</g>
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" fill="none" stroke="${c.axis}" stroke-width="1.5"/>
</svg>
`;
}

await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
for (const theme of Object.keys(THEMES)) {
  const text = svg(theme);
  await writeFile(new URL(`../assets/name-${theme}.svg`, import.meta.url), text);
  console.log(`assets/name-${theme}.svg`, Math.round(text.length / 1024), "KB,", strokes.length, "strokes");
}
