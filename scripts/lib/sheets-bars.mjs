import { randomInt, randomUUID } from 'node:crypto';
import { parseGoogFinanceAllTable } from './goog-finance-parse.mjs';
import { getSheetsApi, requireEnv } from './sheets-client.mjs';
import { assertFetchedBars } from './quote-quality.mjs';

const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

export function allFormula(symbol,start,end,sep=',') {
  if (!/^[A-Z0-9.:-]+$/.test(symbol)) throw new Error('Invalid GOOGLEFINANCE symbol');
  const date=d=>`DATE(${d.getUTCFullYear()}${sep}${d.getUTCMonth()+1}${sep}${d.getUTCDate()})`;
  return `=IFERROR(GOOGLEFINANCE("${symbol}"${sep}"all"${sep}${date(start)}${sep}${date(end)})${sep}"N/A")`;
}

function pollTiming(spanDays,cfg) {
  if(spanDays<=cfg.poll.fast.maxSpanDays) return cfg.poll.fast;
  if(spanDays<=cfg.poll.medium.maxSpanDays) return cfg.poll.medium;
  return cfg.poll;
}

/** Each request, including retries/backfill, owns a fresh worksheet. Concurrent
 * workflows or other repositories cannot overwrite a shared calculation cell.
 */
export async function fetchBarsInIsolatedSheet({sheets,spreadsheetId,cfg,symbol,start,end,sleepImpl=sleep,onObservation}) {
  if (!Number.isFinite(start?.getTime())||!Number.isFinite(end?.getTime())) throw new Error('Invalid fetch date range');
  if(start>end) return [];
  const spanDays=Math.floor((end-start)/86400000);
  const rowCount=spanDays+2; // Inclusive calendar dates plus header, not the old fixed 700 rows.
  const sheetId=randomInt(1,2147483647);
  const title=`BarsFetch-v2-${randomUUID()}`;
  const sep=process.env.SHEETS_FORMULA_SEP===';'||cfg.formulaSep===';'?';':',';
  const formula=allFormula(symbol,start,end,sep);
  let created=false;
  try {
    // Allocate and write atomically, so a new sheet cannot contain previous results.
    await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[
      {addSheet:{properties:{sheetId,title,gridProperties:{rowCount,columnCount:6}}}},
      {updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:[{userEnteredValue:{formulaValue:formula}}]}],fields:'userEnteredValue'}},
    ]}});
    created=true;
    const timing=pollTiming(spanDays,cfg);
    await sleepImpl(timing.initialWaitSec*1000);
    let lastError;
    for(let attempt=1;attempt<=timing.attempts;attempt++) {
      const response=await sheets.spreadsheets.values.batchGet({spreadsheetId,ranges:[`'${title}'!A1:F${rowCount}`],valueRenderOption:'UNFORMATTED_VALUE'});
      try {
        const bars=parseGoogFinanceAllTable(response.data.valueRanges?.[0]?.values??[],{strict:true});
        onObservation?.(bars);
        assertFetchedBars(bars,{start,end});
        return bars;
      } catch(error) {
        lastError=error;
        if(attempt<timing.attempts) await sleepImpl(timing.sleepSec*1000);
      }
    }
    throw lastError??new Error('GOOGLEFINANCE returned no parseable OHLCV rows');
  } finally {
    // Delete only our acknowledged allocation. Ambiguous create timeouts may leave
    // an orphan; never delete a pre-existing worksheet after an allocation failure.
    if(created) {
      try {await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{deleteSheet:{sheetId}}]}});}
      catch {console.warn('[sheets] temporary worksheet cleanup failed; inspect BarsFetch-v2 tabs');}
    }
  }
}

export async function fetchBarsGoogleFinance(root,cfg,symbol,start,end,options={}) {
  if(start>end) return [];
  return fetchBarsInIsolatedSheet({sheets:await getSheetsApi(root),spreadsheetId:requireEnv('GOOGLE_SHEET_ID'),cfg,symbol,start,end,onObservation:options.onObservation});
}

export async function fetchBarsWithSymbolCandidates(root,cfg,candidates,start,end,options={}) {
  if(!candidates.length) throw new Error('No GOOGLEFINANCE symbol candidates');
  let lastError;
  for(let i=0;i<candidates.length;i++) {
    const symbol=candidates[i];
    try {return {symbol,bars:await fetchBarsGoogleFinance(root,cfg,symbol,start,end,options)};}
    catch(error) {
      lastError=error;
      if(!String(error.message).includes('no parseable')||i+1>=candidates.length) throw error;
      console.warn(`[sheets] prefix miss ${symbol}; trying ${candidates[i+1]}`);
    }
  }
  throw lastError;
}
