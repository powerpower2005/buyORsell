#!/usr/bin/env node
/**
 * Merge concurrent data catalog updates (index.json / ticker-names.json).
 *
 * Usage:
 *   node scripts/merge-data-catalog.mjs index \
 *     --base data/index.json \
 *     --overlay /tmp/snap/data/index.json \
 *     --baseline /tmp/snap/index-head.json \
 *     --out data/index.json
 *
 *   node scripts/merge-data-catalog.mjs names \
 *     --base data/ticker-names.json \
 *     --overlay /tmp/snap/data/ticker-names.json \
 *     --baseline /tmp/snap/names-head.json \
 *     --out data/ticker-names.json
 *
 * Rules:
 * - Upsert overlay into base; for index entries, newer fetchedAt wins on the same key.
 * - Keys present in --baseline but missing from overlay are treated as intentional deletes.
 */
import fs from "fs";
import path from "path";

function usage(msg) {
  if (msg) console.error(msg);
  console.error(
    "Usage: node scripts/merge-data-catalog.mjs <index|names> --base <path> --overlay <path> [--baseline <path>] --out <path>",
  );
  process.exit(1);
}

function parseArgs(argv) {
  const kind = argv[2];
  if (kind !== "index" && kind !== "names") usage("kind must be index or names");
  const out = { kind, base: null, overlay: null, baseline: null, out: null };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[++i];
    if (!v) usage(`missing value for ${a}`);
    if (a === "--base") out.base = v;
    else if (a === "--overlay") out.overlay = v;
    else if (a === "--baseline") out.baseline = v;
    else if (a === "--out") out.out = v;
    else usage(`unknown arg ${a}`);
  }
  if (!out.base || !out.overlay || !out.out) usage("missing required args");
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

function entryKey(e) {
  return `${e.ticker}|${e.timeframe}`;
}

function newerFetched(a, b) {
  return String(a?.fetchedAt || "") >= String(b?.fetchedAt || "") ? a : b;
}

function maxIso(...vals) {
  const dates = vals.filter(Boolean).map(String).sort();
  return dates.at(-1) || new Date().toISOString();
}

function mergeIndex(base, overlay, baseline) {
  const map = new Map();
  for (const e of base.entries || []) map.set(entryKey(e), e);
  for (const e of overlay.entries || []) {
    const k = entryKey(e);
    const prev = map.get(k);
    map.set(k, prev ? newerFetched(e, prev) : e);
  }
  if (baseline?.entries) {
    const overlayKeys = new Set((overlay.entries || []).map(entryKey));
    for (const e of baseline.entries) {
      const k = entryKey(e);
      if (!overlayKeys.has(k)) map.delete(k);
    }
  }
  const entries = [...map.values()].sort(
    (a, b) =>
      String(a.ticker).localeCompare(String(b.ticker)) ||
      String(a.timeframe).localeCompare(String(b.timeframe)),
  );
  return {
    schemaVersion: base.schemaVersion ?? overlay.schemaVersion ?? 1,
    updatedAt: maxIso(base.updatedAt, overlay.updatedAt),
    entries,
  };
}

function mergeNames(base, overlay, baseline) {
  const names = { ...(base.names || {}) };
  Object.assign(names, overlay.names || {});
  if (baseline?.names) {
    for (const k of Object.keys(baseline.names)) {
      if (!(k in (overlay.names || {}))) delete names[k];
    }
  }
  return {
    schemaVersion: base.schemaVersion ?? overlay.schemaVersion ?? 1,
    updatedAt: maxIso(base.updatedAt, overlay.updatedAt),
    names,
  };
}

const args = parseArgs(process.argv);
const base = fs.existsSync(args.base)
  ? readJson(args.base)
  : args.kind === "index"
    ? { schemaVersion: 1, updatedAt: new Date().toISOString(), entries: [] }
    : { schemaVersion: 1, updatedAt: new Date().toISOString(), names: {} };
const overlay = readJson(args.overlay);
const baseline = args.baseline && fs.existsSync(args.baseline)
  ? readJson(args.baseline)
  : null;

const merged =
  args.kind === "index"
    ? mergeIndex(base, overlay, baseline)
    : mergeNames(base, overlay, baseline);

writeJson(args.out, merged);
console.log(
  args.kind === "index"
    ? `Merged index: ${merged.entries.length} entries`
    : `Merged names: ${Object.keys(merged.names).length} tickers`,
);
