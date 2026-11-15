import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { assertFetchedBars } from './lib/quote-quality.mjs';
import { REPAIR_ID, HOLIDAYS, digest } from './repair-soxx-history.mjs';
import { persistAggregatesFromDaily } from './validate-and-merge.mjs';

const fields=['open','high','low','close','volume'];
const priceFields=fields.slice(0,4);
// Two additional historical discrepancies explicitly reviewed in run 43732799696.
// These are exact provider corrections, not inferred split ratios or interpolation.
const reviewedCorrections={
  '2024-10-15':{before:[236.96,240.29,236.81,239.8,73112],after:[79.75,80.16,75.24,75.79,6421198]},
  '2024-11-05':{before:[109.71,111.04,109.57,110.94,2273746],after:[73.14,74.02,73.05,73.96,2273746]},
};
export function reconcileProvider(stored,fetched,report) {
  if(stored.data_recovery?.id!==REPAIR_ID||fetched.ticker!=='SOXX:NASDAQ'||fetched.timeframe!=='1d'||fetched.resolvedSymbol!=='NASDAQ:SOXX'||fetched.source!=='google_sheets_googfinance'||fetched.collection_version!=='2.0.0') throw new Error('Unexpected provider recovery identity');
  assertFetchedBars(fetched.ohlcv);
  if(digest(fetched.ohlcv)!==report.fetched_sha256||JSON.stringify(stored.ohlcv.map(b=>b.date))!==JSON.stringify(fetched.ohlcv.map(b=>b.date))||fetched.ohlcv.some(b=>HOLIDAYS.includes(b.date))) throw new Error('Provider recovery dates/hash differ from reviewed evidence');
  const changes=stored.ohlcv.flatMap((before,i)=>{
    const after=fetched.ohlcv[i],changed=fields.filter(k=>before[k]!==after[k]);
    if(!changed.length)return [];
    const reviewed=reviewedCorrections[before.date];
    const exact=reviewed&&fields.every((k,n)=>before[k]===reviewed.before[n]&&after[k]===reviewed.after[n]);
    if(!exact&&changed.some(k=>priceFields.includes(k))&&(before.date>'2024-11-08'||priceFields.some(k=>Math.abs(before[k]-3*after[k])>0.025))) throw new Error('Unreviewed price adjustment; do not scale or replace automatically');
    if(before.volume!==after.volume&&!exact) throw new Error('Unreviewed volume correction');
    return [{date:before.date,fields:changed,before,after}];
  });
  return {changes,quote:{...stored,...fetched,data_recovery:{...stored.data_recovery,holiday_stage_after_sha256:stored.data_recovery.holiday_stage_after_sha256??stored.data_recovery.after_sha256,after_sha256:digest(fetched.ohlcv)}}};
}

function main() {
  const {values:args}=parseArgs({options:{quote:{type:'string'},report:{type:'string'},'run-url':{type:'string'}}});
  if(!/^https:\/\/github\.com\/powerpower2005\/buyORsell\/actions\/runs\/\d+$/.test(args['run-url']??'')) throw new Error('Provider Actions run URL required');
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
  const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
  const stored=read('data/SOXX-NASDAQ/1d.json'),fetched=read(args.quote),report=read(args.report);
  const {quote,changes}=reconcileProvider(stored,fetched,report);
  if(!changes.length){console.log('Provider reconciliation already applied; no changes.');return;}
  const audit=read('data-repairs/2026-11-16.json');
  if(digest(stored.ohlcv)!==audit.after_sha256) throw new Error('Stored recovery snapshot changed');
  const at=new Date().toISOString();
  quote.data_recovery.provider_reconciled_at=at;quote.data_recovery.provider_run_url=args['run-url'];
  audit.holiday_stage_after_sha256=audit.after_sha256;audit.after_sha256=digest(fetched.ohlcv);
  audit.unchanged_remaining_bars=false;
  audit.provider_reconciliation={at,run_url:args['run-url'],fetched_at:fetched.fetchedAt,source_tags:fetched.source_tags,collection_version:fetched.collection_version,price_basis:'Provider split-adjusted prices; volume kept exactly as returned, no local scaling',split_source:'https://www.sec.gov/Archives/edgar/data/1100663/000119312526361162/d133118d497.htm',before_sha256:digest(stored.ohlcv),after_sha256:digest(fetched.ohlcv),changes};
  audit.source_tags=[...new Set([...audit.source_tags,...fetched.source_tags,'SEC:sec.gov'])];
  write('data/SOXX-NASDAQ/1d.json',quote);
  persistAggregatesFromDaily(quote);
  const index=read('data/index.json'),entry=index.entries.find(e=>e.ticker==='SOXX:NASDAQ'&&e.timeframe==='1d');
  Object.assign(entry,{fetchedAt:quote.fetchedAt,barCount:quote.barCount,lastBarDate:quote.lastBarDate});write('data/index.json',index);
  audit.derived=['1w','1mo'].map(tf=>{
    const old=JSON.parse(execFileSync('git',['show',`8e19ef6f682218312637b911259f0a0aa30f2966:data/SOXX-NASDAQ/${tf}.json`],{encoding:'utf8'}));
    const next=read(`data/SOXX-NASDAQ/${tf}.json`);
    return {timeframe:tf,before_count:old.barCount,after_count:next.barCount,before_sha256:digest(old.ohlcv),after_sha256:digest(next.ohlcv),changed_bars:next.ohlcv.filter(b=>!old.ohlcv.some(o=>o.date===b.date&&fields.every(k=>o[k]===b[k]))).length};
  });
  write('data-repairs/2026-11-16.json',audit);
  console.log(JSON.stringify({reconciled_bars:changes.length,volume_changes:changes.filter(c=>c.fields.includes('volume')).length,derived:audit.derived}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) main();
