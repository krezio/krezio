// Writes assets/stack-light.svg and assets/stack-dark.svg: what I build with,
// grouped, as tiles on graph paper.
//
//   node scripts/stack.mjs
//
// Edit STACK below and run it again.
import { mkdir, writeFile } from "node:fs/promises";
import { THEMES, border, esc, fontCss, fontDecl, gridDefs, measure, sheet } from "./paper.mjs";

const STACK = [
  { group: "maths", items: ["Python", "NumPy", "SciPy", "pandas", "scikit-learn", "Matplotlib", "Jupyter", "LaTeX"] },
  { group: "web", items: ["TypeScript", "React", "Next.js", "Vite", "Tailwind", "Hono"] },
  { group: "backend", items: ["Cloudflare Workers", "Supabase", "Postgres", "Drizzle", "Node.js"] },
  { group: "desktop", items: ["C#", ".NET WPF", "Rust", "Tauri"] },
  { group: "testing", items: ["Playwright", "pytest"] },
];

const W = 1000;

function stack(theme) {
  const c = THEMES[theme];
  const TOP = 30;
  const ROW = 52;
  const CHIP = 32;
  const SIZE = 17;
  const LEFT = 170;
  let y = TOP;
  let k = 0;
  let body = "";
  for (const row of STACK) {
    body += `<text x="34" y="${y + 21}" class="group">${esc(row.group)}</text>`;
    let x = LEFT;
    for (const item of row.items) {
      const w = Math.ceil(measure(item, "serif", SIZE) + 26);
      if (x + w > W - 30) {
        x = LEFT;
        y += ROW;
      }
      body += `<g class="chip" style="animation-delay:${0.1 + k * 0.035}s"><rect x="${x + 3}" y="${y + 3}" width="${w}" height="${CHIP}" fill="${c.major}"/><rect x="${x}" y="${y}" width="${w}" height="${CHIP}" fill="${c.paper}" stroke="${c.axis}" stroke-width="1.5"/><text x="${x + 13}" y="${y + 22}" class="item">${esc(item)}</text></g>`;
      x += w + 12;
      k++;
    }
    y += ROW;
  }
  const H = y - ROW + CHIP + TOP + 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${STACK.map((r) => `${r.group}: ${r.items.join(", ")}`).join("; ")}">
<defs>${gridDefs(c)}</defs>
<style>${fontCss("serif", "mono")}
.item{${fontDecl("serif", SIZE)};fill:${c.ink}}
.group{${fontDecl("mono", 16)};fill:${c.pen}}
.chip{opacity:0;animation:in .45s ease-out forwards}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.chip{animation:none;opacity:1}}
</style>
${sheet(c, W, H)}${body}${border(c, W, H)}
</svg>
`;
}

await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
for (const theme of Object.keys(THEMES)) {
  const text = stack(theme);
  await writeFile(new URL(`../assets/stack-${theme}.svg`, import.meta.url), text);
  console.log(`assets/stack-${theme}.svg`, Math.round(text.length / 1024), "KB");
}
