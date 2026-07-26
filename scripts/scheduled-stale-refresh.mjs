#!/usr/bin/env node
/**
 * Cron entry: scan index, refresh stale quotes, write a run report +
 * GitHub Actions Job Summary (GITHUB_STEP_SUMMARY).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  runFetchPipeline,
  validateFreshness,
} from "./validate-and-merge.mjs";
import { tickerToSlug } from "./fetch-quote.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function quoteRel(ticker, timeframe) {
  return `data/${tickerToSlug(ticker)}/${timeframe}.json`;
}

function readQuote(ticker, timeframe) {
  const rel = quoteRel(ticker, timeframe);
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(`# Fetch Quote — scheduled refresh`);
  lines.push("");
  lines.push(`- **When (UTC):** ${report.ranAt}`);
  lines.push(`- **Index entries:** ${report.totals.scanned}`);
  lines.push(`- **Already fresh (skipped):** ${report.totals.fresh}`);
  lines.push(`- **Missing file:** ${report.totals.missing}`);
  lines.push(`- **Stale → attempted:** ${report.totals.stale}`);
  lines.push(`- **Fetched OK:** ${report.totals.fetchedOk}`);
  lines.push(`- **Fetch failed:** ${report.totals.fetchedFail}`);
  lines.push(`- **Bars changed:** ${report.totals.barsChanged}`);
  lines.push("");

  if (report.fresh.length) {
    lines.push(`## Fresh (no fetch)`);
    lines.push("");
    lines.push(`| Ticker | TF | Last bar | Bars | Fetched at |`);
    lines.push(`| --- | --- | --- | ---: | --- |`);
    for (const r of report.fresh) {
      lines.push(
        `| ${mdEscape(r.ticker)} | ${mdEscape(r.timeframe)} | ${mdEscape(r.lastBarDate)} | ${r.barCount ?? "—"} | ${mdEscape(r.fetchedAt ?? "—")} |`,
      );
    }
    lines.push("");
  }

  if (report.missing.length) {
    lines.push(`## Missing data file`);
    lines.push("");
    for (const r of report.missing) {
      lines.push(`- \`${r.ticker}\` (${r.timeframe}) — ${r.path}`);
    }
    lines.push("");
  }

  if (report.fetched.length) {
    lines.push(`## Fetched`);
    lines.push("");
    lines.push(
      `| Ticker | TF | Result | Reason | Last bar before → after | Bars | Derived |`,
    );
    lines.push(`| --- | --- | --- | --- | --- | ---: | --- |`);
    for (const r of report.fetched) {
      const last =
        r.beforeLastBarDate || r.afterLastBarDate
          ? `${r.beforeLastBarDate ?? "—"} → ${r.afterLastBarDate ?? "—"}`
          : "—";
      const derived = r.derived?.length
        ? r.derived.map((d) => `${d.timeframe}:${d.barCount}`).join(", ")
        : "—";
      lines.push(
        `| ${mdEscape(r.ticker)} | ${mdEscape(r.timeframe)} | ${mdEscape(r.action)} | ${mdEscape(r.reason ?? r.error ?? "")} | ${mdEscape(last)} | ${r.afterBarCount ?? "—"} | ${mdEscape(derived)} |`,
      );
    }
    lines.push("");
  }

  if (!report.fetched.length && !report.missing.length) {
    lines.push(`_Nothing to refresh — all indexed quotes were fresh._`);
    lines.push("");
  }

  return lines.join("\n");
}

export async function runScheduledStaleRefresh() {
  const indexPath = "data/index.json";
  const report = {
    ranAt: new Date().toISOString(),
    mode: "schedule",
    totals: {
      scanned: 0,
      fresh: 0,
      missing: 0,
      stale: 0,
      fetchedOk: 0,
      fetchedFail: 0,
      barsChanged: 0,
    },
    fresh: [],
    missing: [],
    fetched: [],
  };

  if (!fs.existsSync(path.join(ROOT, indexPath))) {
    report.note = "data/index.json missing";
    return report;
  }

  const index = loadJson(indexPath);
  const policy = loadJson("config/data-policy.json");
  const entries = index.entries ?? [];

  for (const entry of entries) {
    if (!entry.ticker || !entry.timeframe) continue;
    report.totals.scanned += 1;
    const rel = quoteRel(entry.ticker, entry.timeframe);
    const before = readQuote(entry.ticker, entry.timeframe);

    if (!before) {
      report.totals.missing += 1;
      report.missing.push({
        ticker: entry.ticker,
        timeframe: entry.timeframe,
        path: rel,
      });
      continue;
    }

    const freshness = validateFreshness(before, policy, entry.timeframe);
    if (freshness.status !== "stale") {
      report.totals.fresh += 1;
      report.fresh.push({
        ticker: entry.ticker,
        timeframe: entry.timeframe,
        lastBarDate: before.lastBarDate,
        barCount: before.barCount,
        fetchedAt: before.fetchedAt,
        reason: freshness.reason,
      });
      continue;
    }

    report.totals.stale += 1;
    const row = {
      ticker: entry.ticker,
      timeframe: entry.timeframe,
      staleReason: freshness.reason,
      beforeLastBarDate: before.lastBarDate,
      beforeBarCount: before.barCount,
      beforeFetchedAt: before.fetchedAt,
    };

    console.log(
      `Stale: ${entry.ticker} ${entry.timeframe} (${freshness.reason})`,
    );

    try {
      const result = await runFetchPipeline({
        ticker: entry.ticker,
        timeframe: entry.timeframe,
        force: false,
      });
      const after = result.quote ?? readQuote(entry.ticker, entry.timeframe);
      row.action = result.action;
      row.reason = result.reason ?? freshness.reason;
      row.barsChanged = Boolean(result.barsChanged);
      row.afterLastBarDate = after?.lastBarDate ?? null;
      row.afterBarCount = after?.barCount ?? null;
      row.afterFetchedAt = after?.fetchedAt ?? null;
      row.derived = result.derived ?? [];
      if (row.barsChanged) report.totals.barsChanged += 1;
      report.totals.fetchedOk += 1;
      report.fetched.push(row);
      console.log(
        `OK: ${entry.ticker} ${entry.timeframe} → ${row.action}` +
          ` last ${row.beforeLastBarDate} → ${row.afterLastBarDate}`,
      );
    } catch (e) {
      report.totals.fetchedFail += 1;
      row.action = "error";
      row.error = e instanceof Error ? e.message : String(e);
      report.fetched.push(row);
      console.error(`FAIL: ${entry.ticker} ${entry.timeframe}: ${row.error}`);
    }
  }

  return report;
}

function writeOutputs(report) {
  const outDir = path.join(ROOT, "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "fetch-run-report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`Wrote ${path.relative(ROOT, jsonPath)}`);

  const md = buildMarkdown(report);
  const mdPath = path.join(outDir, "fetch-run-report.md");
  fs.writeFileSync(mdPath, md + "\n");
  console.log(`Wrote ${path.relative(ROOT, mdPath)}`);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, md + "\n");
    console.log("Appended Job Summary");
  } else {
    console.log("\n----- fetch report -----\n" + md);
  }
}

async function main() {
  const report = await runScheduledStaleRefresh();
  writeOutputs(report);
  // Do not fail the job on partial errors — summary + commit should still run.
  if (report.totals.fetchedFail > 0) {
    console.warn(
      `Completed with ${report.totals.fetchedFail} fetch failure(s); see Job Summary.`,
    );
  }
}

if (process.argv[1]?.includes("scheduled-stale-refresh")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
