import { parseGoogFinanceAllTable, snapshotRows } from "./goog-finance-parse.mjs";
import { ensureWorksheet, getSheetsApi, requireEnv } from "./sheets-client.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formulaSep(cfg) {
  if (process.env.SHEETS_FORMULA_SEP === ";") return ";";
  return cfg.formulaSep === ";" ? ";" : ",";
}

function allFormula(symbol, start, end, sep) {
  const sym = `"${symbol}"`;
  return (
    `=IFERROR(GOOGLEFINANCE(${sym}${sep}"all"${sep}` +
    `DATE(${start.getUTCFullYear()},${start.getUTCMonth() + 1},${start.getUTCDate()})${sep}` +
    `DATE(${end.getUTCFullYear()},${end.getUTCMonth() + 1},${end.getUTCDate()}))${sep}"N/A")`
  );
}

function scratchRow(index, stride) {
  return 1 + index * stride;
}

function readRangeForRow(row, scratchCol, stride) {
  const endRow = row + stride - 1;
  return `${scratchCol}${row}:AF${endRow}`;
}

function pollTiming(spanDays, cfg) {
  const p = cfg.poll;
  if (spanDays <= p.fast.maxSpanDays) return p.fast;
  if (spanDays <= p.medium.maxSpanDays) return p.medium;
  return { initialWaitSec: p.initialWaitSec, attempts: p.attempts, sleepSec: p.sleepSec };
}

function parseSliceOrThrow(rows, job) {
  const parsed = parseGoogFinanceAllTable(rows);
  if (parsed.length) return parsed;
  const flat = (rows || []).flat().map((c) => String(c ?? "").trim()).filter(Boolean);
  const token = flat.length === 1 ? flat[0] : null;
  throw new Error(
    `GOOGLEFINANCE returned no parseable OHLCV rows for ${job.symbol}` +
      (token ? ` (cell=${token})` : "") +
      ` snapshot=${snapshotRows(rows)}`,
  );
}

/**
 * Fetch daily OHLCV via GOOGLEFINANCE "all" in a Sheets scratch cell.
 * Based on Hedge scripts/common/bars_sheets.py
 */
export async function fetchBarsGoogleFinance(root, cfg, symbol, start, end) {
  if (start > end) return [];

  const spreadsheetId = requireEnv("GOOGLE_SHEET_ID");
  const sheets = await getSheetsApi(root);
  await ensureWorksheet(sheets, spreadsheetId, cfg.worksheetBarsFetch);

  const sep = formulaSep(cfg);
  const stride = cfg.rowStride;
  const row = scratchRow(0, stride);
  const cell = `${cfg.scratchCol}${row}`;
  const formula = allFormula(symbol, start, end, sep);
  const range = readRangeForRow(row, cfg.scratchCol, stride);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [{ range: `'${cfg.worksheetBarsFetch}'!${cell}`, values: [[formula]] }],
    },
  });

  const spanDays = Math.max(0, Math.floor((end - start) / 86400000));
  const timing = pollTiming(spanDays, cfg);
  await sleep(timing.initialWaitSec * 1000);

  let lastRows = [];
  for (let attempt = 1; attempt <= timing.attempts; attempt++) {
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [`'${cfg.worksheetBarsFetch}'!${range}`],
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    lastRows = res.data.valueRanges?.[0]?.values || [];
    try {
      return parseSliceOrThrow(lastRows, { symbol, start, end });
    } catch (e) {
      if (attempt >= timing.attempts) throw e;
      await sleep(timing.sleepSec * 1000);
    }
  }

  return parseSliceOrThrow(lastRows, { symbol, start, end });
}

export async function fetchBarsWithSymbolCandidates(
  root,
  cfg,
  candidates,
  start,
  end,
) {
  if (!candidates.length) {
    throw new Error("No GOOGLEFINANCE symbol candidates");
  }

  let lastErr = null;
  for (let i = 0; i < candidates.length; i++) {
    const symbol = candidates[i];
    try {
      const bars = await fetchBarsGoogleFinance(root, cfg, symbol, start, end);
      if (bars.length) {
        return { symbol, bars };
      }
      lastErr = new Error(`GOOGLEFINANCE empty for ${symbol}`);
    } catch (e) {
      lastErr = e;
      const msg = String(e.message || e);
      const retryable = msg.includes("no parseable") || msg.includes("N/A");
      if (!retryable || i + 1 >= candidates.length) throw e;
      console.warn(`[sheets] prefix miss ${symbol}; trying ${candidates[i + 1]}`);
    }
  }
  throw lastErr || new Error("All symbol candidates returned no bars");
}
