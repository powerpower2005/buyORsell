import { financeSymbolCandidates } from "./finance-symbol.mjs";
import { ensureWorksheet, getSheetsApi, requireEnv } from "./sheets-client.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formulaSep(cfg) {
  if (process.env.SHEETS_FORMULA_SEP === ";") return ";";
  return cfg.formulaSep === ";" ? ";" : ",";
}

function nameFormula(symbol, sep) {
  return `=IFERROR(GOOGLEFINANCE("${symbol}"${sep}"name")${sep}"")`;
}

/**
 * Resolve a display name via Sheets GOOGLEFINANCE(..., "name").
 * Tries exchange-prefix candidates (NASDAQ:NVDA, …).
 */
export async function fetchTickerDisplayName(root, cfg, ticker) {
  const spreadsheetId = requireEnv("GOOGLE_SHEET_ID");
  const sheets = await getSheetsApi(root);
  const sheetTitle = cfg.worksheetTickerNames || "TickerNames-v1";
  await ensureWorksheet(sheets, spreadsheetId, sheetTitle);

  const sep = formulaSep(cfg);
  const cell = `${cfg.scratchCol || "Z"}1`;
  const range = `'${sheetTitle}'!${cell}`;

  let candidates;
  try {
    candidates = financeSymbolCandidates(ticker);
  } catch (e) {
    throw new Error(`Cannot build symbol candidates for ${ticker}: ${e.message || e}`);
  }

  let lastErr = null;
  for (let i = 0; i < candidates.length; i++) {
    const symbol = candidates[i];
    const formula = nameFormula(symbol, sep);

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [{ range, values: [[formula]] }],
      },
    });

    await sleep(2500);

    for (let attempt = 1; attempt <= 6; attempt++) {
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: [range],
        valueRenderOption: "FORMATTED_VALUE",
      });
      const raw = res.data.valueRanges?.[0]?.values?.[0]?.[0];
      const name = String(raw ?? "").trim();

      if (
        name &&
        name !== "#N/A" &&
        name !== "N/A" &&
        !name.startsWith("#") &&
        name.toLowerCase() !== "loading..."
      ) {
        return { symbol, name };
      }

      if (attempt < 6) await sleep(1500);
    }

    lastErr = new Error(`No name for ${symbol}`);
    if (i + 1 < candidates.length) {
      console.warn(`[names] miss ${symbol}; trying next candidate`);
    }
  }

  throw lastErr || new Error(`No display name for ${ticker}`);
}
