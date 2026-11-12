// Updates the live parts of the README once a day:
//   - the GitHub line: when I joined, and my contributions in the last 7 days
//   - Project Euler: today's problem, and the spiral of the first 100 problems with
//     the solved ones filled in
//
//   GITHUB_TOKEN=... EULER_SITE=... node scripts/daily.mjs
//
// A GitHub Action runs this every day (.github/workflows/daily.yml). It needs
// nothing installed beyond Node 20. EULER_SITE is the site my Project Euler log
// lives on; it's kept in a repository secret rather than here. Without a token the
// GitHub line is left as it is.
import { readFile, writeFile } from "node:fs/promises";
import { THEMES, fontCss, fontDecl } from "./paper.mjs";

const USER = "krezio";

const SITE = process.env.EULER_SITE?.replace(/\/$/, "");
if (!SITE) throw new Error("set EULER_SITE");
const README = new URL("../README.md", import.meta.url);
const CELL = 22;

async function json(path) {
  const res = await fetch(SITE + path, { headers: { "user-agent": "krezio-profile-readme" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// Grid position of 1..100 as an Ulam spiral, the same layout as on the site.
function spiralCells() {
  const cells = [];
  let x = 0;
  let y = 0;
  let dx = 1;
  let dy = 0;
  let run = 1;
  let n = 1;
  while (n <= 100) {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < run && n <= 100; i++) {
        cells.push({ n, x, y });
        x += dx;
        y += dy;
        n++;
      }
      [dx, dy] = [dy, -dx];
    }
    run++;
  }
  return cells;
}

function spiralSvg(theme, solved, today) {
  const c = THEMES[theme];
  const cells = spiralCells();
  const minX = Math.min(...cells.map((p) => p.x));
  const minY = Math.min(...cells.map((p) => p.y));
  const pad = CELL;
  const size = 10 * CELL + 2 * pad;
  let body = "";
  for (const p of cells) {
    const x = pad + (p.x - minX) * CELL;
    const y = pad + (p.y - minY) * CELL;
    const isToday = p.n === today;
    const isSolved = solved.has(p.n);
    if (isToday) body += `<rect x="${x + 1}" y="${y + 1}" width="${CELL - 1}" height="${CELL - 1}" fill="${c.pen}"/>`;
    else if (isSolved) body += `<rect x="${x + 1}" y="${y + 1}" width="${CELL - 1}" height="${CELL - 1}" fill="${c.wash}"/>`;
    const fill = isToday ? c.paper : isSolved ? c.ink : c.faint;
    const cls = isToday || isSolved ? "b" : "r";
    body += `<text x="${x + CELL / 2 + 0.5}" y="${y + CELL / 2 + 4}" fill="${fill}" class="${cls}">${p.n}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${solved.size} of the first 100 Project Euler problems solved, spiralling out from 1">
<style>${fontCss("bold", "serif")}.b{${fontDecl("bold", 10.5)}}.r{${fontDecl("serif", 10.5)}}</style>
<defs><pattern id="g" width="${CELL}" height="${CELL}" patternUnits="userSpaceOnUse" x="${pad}" y="${pad}"><path d="M${CELL} 0H0V${CELL}" fill="none" stroke="${c.grid}"/></pattern></defs>
<rect width="${size}" height="${size}" fill="${c.paper}"/>
<rect width="${size}" height="${size}" fill="url(#g)"/>
<rect x="${pad + 0.5}" y="${pad + 0.5}" width="${10 * CELL}" height="${10 * CELL}" fill="none" stroke="${c.axis}"/>
<rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" fill="none" stroke="${c.axis}" stroke-width="1.5"/>
<g text-anchor="middle">${body}</g>
</svg>
`;
}

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const index = await json("/api/euler");
const n = index.pick.problem;
const problem = await json(`/data/euler/${n}.json`);
const solved = new Set(index.solved);
const date = longDate.format(new Date(`${index.today}T00:00:00Z`));
const label = index.pick.reason === "today" ? "Today's problem" : "Problem of the day";

for (const theme of Object.keys(THEMES)) {
  await writeFile(new URL(`../assets/euler-${theme}.svg`, import.meta.url), spiralSvg(theme, solved, n));
}

const block = `<!-- euler:start -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/euler-dark.svg">
  <img align="right" width="200" src="assets/euler-light.svg" alt="${solved.size} of the first 100 Project Euler problems solved">
</picture>

**${label}, ${date}**

### [Problem ${n}: ${problem.title}](https://projecteuler.net/problem=${n})

I'm working through [Project Euler](https://projecteuler.net/) one problem a day. ${solved.size} of the first 100 solved so far, spiralling out from 1 on the right; today's is the red square.

[Read today's problem on Project Euler →](https://projecteuler.net/problem=${n})
<br clear="right">
<!-- euler:end -->`;

// The GitHub line: how long I've been here, and my contributions this past week.
async function githubLine() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const query = `query { user(login: "${USER}") { createdAt contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json", "user-agent": "krezio-profile-readme" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GitHub: ${res.status}`);
  const { data } = await res.json();
  const cal = data.user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const week = days.slice(-7).reduce((sum, d) => sum + d.contributionCount, 0);
  const joined = new Date(data.user.createdAt);
  const now = new Date();
  let years = now.getUTCFullYear() - joined.getUTCFullYear();
  if (now.getUTCMonth() < joined.getUTCMonth() || (now.getUTCMonth() === joined.getUTCMonth() && now.getUTCDate() < joined.getUTCDate())) years--;
  const plural = (n, one) => `${n.toLocaleString("en-GB")} ${one}${n === 1 ? "" : "s"}`;
  return `<!-- github:start -->
<sub>Joined GitHub ${plural(years, "year")} ago · ${plural(week, "contribution")} in the last 7 days</sub>
<!-- github:end -->`;
}

const between = (text, name, block) => {
  const re = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!re.test(text)) throw new Error(`README has no ${name} markers`);
  return text.replace(re, block);
};

let readme = await readFile(README, "utf8");
readme = between(readme, "euler", block);
const github = await githubLine();
if (github) readme = between(readme, "github", github);
await writeFile(README, readme);
console.log(`Problem ${n}: ${problem.title} (${solved.size} solved)`);
if (github) console.log(github.split("\n")[1].replace(/<\/?sub>/g, ""));
