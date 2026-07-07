const ERROR_TOKENS = new Set(["N/A", "#N/A", "#REF!", "#ERROR!", "#NAME?", ""]);

export function parseDateCell(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && raw > 30_000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + raw * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (!s || ERROR_TOKENS.has(s)) return null;
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  return null;
}

function parseNum(raw, { allowZero = false } = {}) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (ERROR_TOKENS.has(s)) return null;
  const v = Number(s.replace(/,/g, ""));
  if (Number.isNaN(v)) return null;
  if (allowZero) {
    if (v < 0) return null;
  } else if (v <= 0) {
    return null;
  }
  return v;
}

/**
 * Parse GOOGLEFINANCE(..., "all", ...) spill table.
 * Ported from Hedge scripts/common/bars_sheets.py
 */
export function parseGoogFinanceAllTable(rows) {
  if (!rows?.length) return [];

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.length) continue;
    const cells = [...row];
    while (cells.length < 6) cells.push("");
    const [dRaw, oRaw, hRaw, lRaw, cRaw, vRaw] = cells;
    const d = parseDateCell(dRaw);
    if (!d) {
      if (i === 0 && String(dRaw).trim().toLowerCase() === "date") continue;
      continue;
    }
    const o = parseNum(oRaw);
    const h = parseNum(hRaw);
    const l = parseNum(lRaw);
    const c = parseNum(cRaw);
    if (o == null || h == null || l == null || c == null) continue;
    const bar = { date: d, open: o, high: h, low: l, close: c };
    const vol = parseNum(vRaw, { allowZero: true });
    if (vol != null) bar.volume = vol;
    out.push(bar);
  }
  return out;
}

export function snapshotRows(rows, maxRows = 4) {
  if (!rows?.length) return "(empty grid)";
  const lines = rows.slice(0, maxRows).map((row) => {
    const cells = (row || []).slice(0, 8).map((c) => String(c ?? "").trim());
    return cells.some(Boolean) ? cells.join(" | ") : "(blank row)";
  });
  if (rows.length > maxRows) lines.push(`... (${rows.length} row(s) in slice)`);
  return lines.join("; ");
}
