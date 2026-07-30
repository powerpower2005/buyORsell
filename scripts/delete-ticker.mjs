#!/usr/bin/env node
/**
 * Remove a ticker's quote files, meta status, index entries, and (optionally) display name.
 *
 * Usage:
 *   node scripts/delete-ticker.mjs .IXIC:INDEXNASDAQ
 *   node scripts/delete-ticker.mjs .IXIC:INDEXNASDAQ --timeframe 1d
 *   node scripts/delete-ticker.mjs .IXIC:INDEXNASDAQ --keep-name
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Same as scripts/fetch-quote.mjs — kept local to avoid pulling googleapis. */
function tickerToSlug(ticker) {
  return ticker.replace(/:/g, "-");
}
const TICKER_RE = /^[A-Z0-9.]+:[A-Z]+$/i;

/** Keep leading dots; uppercase letters in symbol + full exchange. */
function normalizeTicker(raw) {
  const trimmed = String(raw || "").trim();
  const i = trimmed.indexOf(":");
  if (i < 0) return trimmed.toUpperCase();
  const sym = trimmed.slice(0, i).replace(/[a-z]/g, (c) => c.toUpperCase());
  const exch = trimmed.slice(i + 1).toUpperCase();
  return `${sym}:${exch}`;
}

function parseArgs(argv) {
  let ticker = "";
  let timeframe = "all";
  let keepName = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--timeframe" || arg === "-t") {
      timeframe = (argv[++i] || "all").trim() || "all";
      continue;
    }
    if (arg === "--keep-name") {
      keepName = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    if (!ticker) ticker = arg.trim();
    else throw new Error(`Unexpected argument: ${arg}`);
  }

  ticker = normalizeTicker(ticker);
  if (!ticker || !TICKER_RE.test(ticker)) {
    throw new Error(
      `Invalid or missing ticker. Example: .IXIC:INDEXNASDAQ (got ${JSON.stringify(ticker)})`,
    );
  }

  const tf = timeframe.toLowerCase();
  if (tf !== "all" && !/^\d+[dwmh]$/i.test(tf)) {
    throw new Error(`Invalid timeframe: ${timeframe} (use all, 1d, 1w, …)`);
  }

  return { ticker, timeframe: tf, keepName };
}

function rmPath(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return false;
  fs.rmSync(full, { recursive: true, force: true });
  return true;
}

function listQuoteFiles(slug) {
  const dir = path.join(ROOT, "data", slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
}

function main() {
  const { ticker, timeframe, keepName } = parseArgs(process.argv.slice(2));
  const slug = tickerToSlug(ticker);

  const removed = [];
  const missing = [];

  const indexPath = path.join(ROOT, "data/index.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error("data/index.json missing");
  }
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const before = (index.entries || []).length;

  const quoteTfs =
    timeframe === "all"
      ? [
          ...new Set([
            ...listQuoteFiles(slug),
            ...(index.entries || [])
              .filter((e) => e.ticker === ticker)
              .map((e) => e.timeframe),
          ]),
        ]
      : [timeframe];

  if (quoteTfs.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          ticker,
          message: "No quote files or index entries found for this ticker",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  for (const tf of quoteTfs) {
    const quoteRel = `data/${slug}/${tf}.json`;
    const metaRel = `data/.meta/${slug}/${tf}.status.json`;
    if (rmPath(quoteRel)) removed.push(quoteRel);
    else missing.push(quoteRel);
    if (rmPath(metaRel)) removed.push(metaRel);
    else missing.push(metaRel);
  }

  const dataDir = path.join(ROOT, "data", slug);
  const metaDir = path.join(ROOT, "data", ".meta", slug);
  if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length === 0) {
    rmPath(`data/${slug}`);
    removed.push(`data/${slug}/`);
  }
  if (fs.existsSync(metaDir) && fs.readdirSync(metaDir).length === 0) {
    rmPath(`data/.meta/${slug}`);
    removed.push(`data/.meta/${slug}/`);
  }

  index.entries = (index.entries || []).filter((e) => {
    if (e.ticker !== ticker) return true;
    if (timeframe === "all") return false;
    return e.timeframe !== timeframe;
  });
  index.updatedAt = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
  removed.push("data/index.json");

  let nameRemoved = null;
  if (!keepName && timeframe === "all") {
    const namesPath = path.join(ROOT, "data/ticker-names.json");
    if (fs.existsSync(namesPath)) {
      const store = JSON.parse(fs.readFileSync(namesPath, "utf8"));
      if (store.names && Object.prototype.hasOwnProperty.call(store.names, ticker)) {
        nameRemoved = store.names[ticker];
        delete store.names[ticker];
        store.updatedAt = new Date().toISOString();
        fs.writeFileSync(namesPath, JSON.stringify(store, null, 2) + "\n");
        removed.push("data/ticker-names.json");
      }
    }
  }

  const report = {
    ok: true,
    ticker,
    timeframe,
    indexEntriesRemoved: before - index.entries.length,
    indexEntriesLeft: index.entries.length,
    nameRemoved,
    removed,
    missing,
  };

  console.log(JSON.stringify(report, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      `## Delete ticker`,
      ``,
      `- **Ticker:** \`${ticker}\``,
      `- **Timeframe:** \`${timeframe}\``,
      `- **Index entries removed:** ${report.indexEntriesRemoved}`,
      nameRemoved != null
        ? `- **Name removed:** ${nameRemoved}`
        : `- **Name:** kept`,
      ``,
      `### Removed paths`,
      ...removed.map((p) => `- \`${p}\``),
      ``,
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
  }
}

try {
  const isMain =
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  if (isMain) main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
