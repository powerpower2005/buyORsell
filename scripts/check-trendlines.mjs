/**
 * Smoke-check V1/V2 trendlines against local data/*.json quotes.
 * Pure JS port of the scoring gates (imports via dynamic transpile avoided).
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Use esbuild-register style: spawn tsc isn't needed — inline minimal runners
// by importing compiled path. Prefer bundling with esbuild if available.
const require = createRequire(import.meta.url);

async function loadDetectors() {
  try {
    const esbuild = await import("esbuild");
    const entry = join(root, "scripts/_trendline_entry.ts");
    const { writeFileSync, unlinkSync } = await import("fs");
    writeFileSync(
      entry,
      `
export { detectTrendlines } from "../src/lib/evaluation/trendlines.ts";
export { detectTrendlinesV2 } from "../src/lib/evaluation/trendlinesV2.ts";
`,
    );
    const outfile = join(root, "scripts/_trendline_bundle.mjs");
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile,
      packages: "external",
    });
    const mod = await import(`file://${outfile}?t=${Date.now()}`);
    try {
      unlinkSync(entry);
    } catch {
      /* ignore */
    }
    return mod;
  } catch (err) {
    console.error("esbuild bundle failed:", err);
    throw err;
  }
}

const { detectTrendlines, detectTrendlinesV2 } = await loadDetectors();

const dataRoot = join(root, "data");
const tickers = readdirSync(dataRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("."))
  .map((d) => d.name);

let anyV2 = false;

for (const slug of tickers) {
  const path = join(dataRoot, slug, "1d.json");
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    continue;
  }
  const bars = raw.ohlcv ?? [];
  if (!bars.length) continue;
  const t0 = Date.now();
  const v1 = detectTrendlines(bars);
  const v2 = detectTrendlinesV2(bars);
  const ms = Date.now() - t0;
  console.log(`\n=== ${raw.ticker} bars=${bars.length} ${ms}ms ===`);
  console.log(
    `V1 asc=${v1.ascending.length} desc=${v1.descending.length}`,
  );
  console.log(
    `V2 asc=${v2.ascending.length} desc=${v2.descending.length}`,
  );
  for (const l of [...v2.ascending, ...v2.descending]) {
    anyV2 = true;
    console.log(
      `  V2 ${l.kind} score=${l.score} touches=${l.touches} broken=${l.broken} ${l.date1} -> ${l.date2}`,
    );
  }
  if (!v2.ascending.length && !v2.descending.length) {
    console.log("  V2: no lines");
  }
}

console.log(
  `\nSummary: V2 produced lines on at least one ticker? ${anyV2 ? "YES" : "NO"}`,
);
