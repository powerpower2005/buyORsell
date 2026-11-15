import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertFetchedBars } from './lib/quote-quality.mjs';
import { persistAggregatesFromDaily } from './validate-and-merge.mjs';

export const REPAIR_ID='soxx-foreign-holiday-bars-2026-11-16';
export const HOLIDAYS=['2024-09-02','2024-11-28','2025-01-09','2025-01-20','2025-02-17','2025-04-18','2025-05-26','2025-06-19','2025-07-04','2025-09-01','2025-11-27','2026-01-19','2026-04-03','2026-06-19','2026-07-03'];
export const SOURCES=[
  'https://ir.theice.com/press/news-details/2023/NYSE-Group-Announces-2024-2025-and-2026-Holiday-and-Early-Closings-Calendar/default.aspx',
  'https://www.nasdaq.com/docs/2025/02/18/0018-25_2025%20Holiday%20%26%20Trading%20Hours_v02.pdf',
  'https://www.nasdaq.com/press-release/nasdaq-announces-closure-its-us-markets-honor-national-day-mourning-former-president',
  'https://www.nasdaqtrader.com/Trader.aspx?id=Calendar',
];
const fields=['date','open','high','low','close','volume'];
const equal=(a,b)=>fields.every(k=>a[k]===b[k]);
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function repairSoxx(quote,witness,at=new Date().toISOString()) {
  if(quote.ticker!=='SOXX:NASDAQ'||quote.timeframe!=='1d'||witness.ticker!=='009150:KRX') throw new Error('Unexpected repair identity');
  const removed=quote.ohlcv.filter(b=>witness.ohlcv.some(other=>equal(b,other)));
  if(!removed.length&&quote.data_recovery?.id===REPAIR_ID) return {quote,audit:null};
  if(JSON.stringify(removed.map(b=>b.date).sort())!==JSON.stringify(HOLIDAYS)) throw new Error('Repair evidence changed; review dates and exact foreign OHLCV matches');
  const ohlcv=quote.ohlcv.filter(b=>!HOLIDAYS.includes(b.date));
  assertFetchedBars(ohlcv);
  // This is removal of proven foreign bars on closed sessions, never interpolation.
  const data_recovery={id:REPAIR_ID,version:'1.0.0',repaired_at:at,audit_path:'data-repairs/2026-11-16.json',before_sha256:digest(quote.ohlcv),after_sha256:digest(ohlcv)};
  const restored={...quote,source_tags:quote.source_tags??['GoogleFinance:google.com/finance'],ohlcv,barCount:ohlcv.length,lastBarDate:ohlcv.at(-1).date,data_recovery};
  const audit={...data_recovery,ticker:quote.ticker,source_commit:'8e19ef6f682218312637b911259f0a0aa30f2966',source_tags:['GoogleFinance:google.com/finance','Audit:cross-symbol-OHLCV','Calendar:Nasdaq','Calendar:NYSE'],evidence_ticker:witness.ticker,evidence_sha256:digest(witness.ohlcv),calendar_sources:SOURCES,removed_bars:removed,before_count:quote.ohlcv.length,after_count:ohlcv.length,unchanged_remaining_bars:true,preserved_fetched_at:quote.fetchedAt};
  return {quote:restored,audit};
}

function main() {
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
  const dailyPath='data/SOXX-NASDAQ/1d.json';
  const {quote,audit}=repairSoxx(read(dailyPath),read('data/009150-KRX/1d.json'));
  if(!audit){console.log('SOXX recovery already applied; no changes.');return;}
  const oldAggregates=Object.fromEntries(['1w','1mo'].map(tf=>[tf,read(`data/SOXX-NASDAQ/${tf}.json`)]));
  const write=(relative,value)=>{fs.mkdirSync(path.dirname(path.join(root,relative)),{recursive:true});fs.writeFileSync(path.join(root,relative),JSON.stringify(value,null,2)+'\n');};
  write(dailyPath,quote);
  persistAggregatesFromDaily(quote);
  const index=read('data/index.json');
  const entry=index.entries.find(e=>e.ticker===quote.ticker&&e.timeframe==='1d');
  Object.assign(entry,{barCount:quote.barCount,lastBarDate:quote.lastBarDate,fetchedAt:quote.fetchedAt});write('data/index.json',index);
  audit.derived=Object.entries(oldAggregates).map(([tf,old])=>{const next=read(`data/SOXX-NASDAQ/${tf}.json`);return {timeframe:tf,before_count:old.barCount,after_count:next.barCount,before_sha256:digest(old.ohlcv),after_sha256:digest(next.ohlcv),changed_bars:next.ohlcv.filter(b=>!old.ohlcv.some(o=>equal(b,o))).length};});
  write('data-repairs/2026-11-16.json',audit);
  console.log(JSON.stringify({ticker:quote.ticker,removed:audit.removed_bars.length,before:audit.before_count,after:audit.after_count,derived:audit.derived}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) main();
