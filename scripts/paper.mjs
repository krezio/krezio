// Shared pieces for the README images: the graph-paper colours, the grid, and
// Computer Modern embedded so the text looks the same as on my site.
import { readFileSync } from "node:fs";

export const THEMES = {
  light: { paper: "#eef3e7", grid: "#d6e2cf", major: "#b9d0b2", axis: "#1d2c23", ink: "#15211a", ink2: "#3f4f45", ink3: "#5c6c61", faint: "#9fb3a3", pen: "#c32f18", wash: "#e8d6c9", circle: "#2c5a44" },
  dark: { paper: "#111e19", grid: "#1c2f27", major: "#2b4539", axis: "#dfe8da", ink: "#e9efe3", ink2: "#bccabd", ink3: "#93a596", faint: "#4f6658", pen: "#ff8a70", wash: "#3a2f27", circle: "#8fd0ad" },
};

const fontDir = new URL("../data/fonts/", import.meta.url);
const metrics = JSON.parse(readFileSync(new URL("metrics.json", fontDir), "utf8"));

export const FACES = {
  serif: "cmu-serif-roman",
  bold: "cmu-serif-bold",
  mono: "cmu-tt-roman",
};
const FAMILY = { serif: "CMU Serif", bold: "CMU Serif", mono: "CMU Typewriter" };
const STYLE = { serif: "font-weight:400", bold: "font-weight:700", mono: "" };
const FALLBACK = { serif: "Georgia,serif", bold: "Georgia,serif", mono: "Consolas,monospace" };

// @font-face rules for the faces an image uses, with each font inlined
export function fontCss(...faces) {
  return faces
    .map((f) => {
      const data = readFileSync(new URL(`${FACES[f]}.woff2`, fontDir)).toString("base64");
      const weight = f === "bold" ? 700 : 400;
      const style = "normal";
      return `@font-face{font-family:"${FAMILY[f]}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};font-style:${style}}`;
    })
    .join("");
}

// the CSS for text in a face, e.g. `font:${font("bold", 52)}`
export const fontDecl = (face, size) =>
  `font-family:"${FAMILY[face]}",${FALLBACK[face]};font-size:${size}px;${STYLE[face]}`;

// width of a string in px
export function measure(text, face, size) {
  const m = metrics[FACES[face]];
  let w = 0;
  for (const ch of text) w += m[ch] ?? 0.5;
  return w * size;
}

export function gridDefs(c, step = 20) {
  const big = step * 5;
  return `<pattern id="minor" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><path d="M${step} 0H0V${step}" fill="none" stroke="${c.grid}"/></pattern>
<pattern id="major" width="${big}" height="${big}" patternUnits="userSpaceOnUse"><rect width="${big}" height="${big}" fill="url(#minor)"/><path d="M${big} 0H0V${big}" fill="none" stroke="${c.major}"/></pattern>`;
}

// paper, grid and a border, for an image W by H
export const sheet = (c, W, H) =>
  `<rect width="${W}" height="${H}" fill="${c.paper}"/><rect width="${W}" height="${H}" fill="url(#major)"/>`;
export const border = (c, W, H) =>
  `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" fill="none" stroke="${c.axis}" stroke-width="1.5"/>`;

export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
