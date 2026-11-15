/** Explicit offline repair from reviewed provider artifacts, never a scheduled mutation. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readDailyQuotes,integrityPolicy,assertQuoteIntegrity,barsHash} from './lib/universe-integrity.mjs';
import {applyReviewedCorrections} from './lib/reviewed-corrections.mjs';
import {compareIndependent,parseIndependent,yahooSymbol} from './lib/independent-prices.mjs';
import {compareBars} from './audit-provider-history.mjs';
import {persistAggregatesFromDaily} from './validate-and-merge.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
export function planRecovery(before,raw,reference,policy=integrityPolicy()) {
  const corrected=applyReviewedCorrections(raw,before.ticker.split(':').reverse().join(':'),policy);
  const comparison=compareIndependent(before.ticker,corrected.bars,reference,policy);
  const quote={...before,ohlcv:corrected.bars,barCount:corrected.bars.length,lastBarDate:corrected.bars.at(-1).date};
  assertQuoteIntegrity(quote,[],policy);
  return {quote,comparison,applied:corrected.applied,diff:compareBars(before.ohlcv,quote.ohlcv)};
}
async function main(){
  const provider=process.argv[2],independent=process.argv[3],runUrl=process.argv[4];
  if(!provider||!independent||!/^https:\/\/github.com\/powerpower2005\/buyORsell\/actions\/runs\/\d+$/.test(runUrl??''))throw new Error('Usage: repair-universe-history.mjs PROVIDER_DIR INDEPENDENT_DIR VERIFIED_RUN_URL');
  const report=read(path.join(provider,'report.json')),policy=integrityPolicy(),id='universe-history-2026-11-16-v1';
  const audit={id,version:'1.0.0',repaired_at:new Date().toISOString(),provider_run:runUrl,source_tags:['GoogleFinance:GOOGLEFINANCE','GoogleSheets:sheets.googleapis.com','YahooFinance:query1.finance.yahoo.com','NaverFinance:fchart.stock.naver.com'],scope_count:report.series.length,series:[],quarantined:[],policy_sha256:barsHash(policy)};
  const planned=[];
  for(const before of readDailyQuotes()){
    const slug=before.ticker.replaceAll(':','-'),entry=report.series.find(s=>s.ticker===before.ticker);
    if(!entry||entry.stored_sha256!==barsHash(before.ohlcv))throw new Error(`Stored baseline changed: ${before.ticker}`);
    if(policy.quarantined[before.ticker]){audit.quarantined.push({ticker:before.ticker,before_sha256:entry.stored_sha256,count:before.barCount,reason:policy.quarantined[before.ticker].reason});continue;}
    const raw=read(path.join(provider,slug+'.observation.json')),evidence=read(path.join(independent,slug+'.json'));
    const ref=parseIndependent(evidence.raw,yahooSymbol(before.ticker));
    const plan=planRecovery(before,raw,ref,policy),changed=barsHash(before.ohlcv)!==barsHash(plan.quote.ohlcv);
    const providerQuotePath=path.join(provider,slug+'.json');
    const fetchedAt=fs.existsSync(providerQuotePath)?read(providerQuotePath).fetchedAt:report.verified_at;
    const quote={...plan.quote,source:'google_sheets_googfinance',collection_version:'3.0.0',fetchedAt,source_tags:['GoogleFinance:GOOGLEFINANCE','GoogleSheets:sheets.googleapis.com','Validation:query1.finance.yahoo.com'],integrity_verification:{...plan.comparison,verified_at:audit.repaired_at,independent_fetched_at:evidence.fetched_at},provider_corrections:plan.applied};
    if(plan.applied.length)quote.source_tags.push('YahooFinance:query1.finance.yahoo.com');
    if(['010120:KRX','KOSPI:KRX'].includes(before.ticker))quote.source_tags.push('NaverFinance:fchart.stock.naver.com');
    if(changed)quote.data_recovery={id,version:'1.0.0',audit:'data-repairs/2026-11-16-universe.json',provider_reconciled_at:audit.repaired_at,before_sha256:barsHash(before.ohlcv),after_sha256:barsHash(quote.ohlcv),...(before.data_recovery?{previous:before.data_recovery}:{})};
    audit.series.push({ticker:before.ticker,status:changed?'repaired':'unchanged',before_count:before.barCount,after_count:quote.barCount,before_sha256:barsHash(before.ohlcv),raw_provider_sha256:barsHash(raw),after_sha256:barsHash(quote.ohlcv),independent_sha256:barsHash(ref),independent_url:evidence.url,verification:quote.integrity_verification,corrections:plan.applied,...plan.diff});
    planned.push(quote);
  }
  // All plans must validate together before any live file is changed.
  for(const quote of planned)assertQuoteIntegrity(quote,planned,policy);
  for(const entry of audit.quarantined){const slug=entry.ticker.replaceAll(':','-');for(const tf of ['1d','1w','1mo']){const source=path.join(ROOT,'data',slug,tf+'.json'),destination=path.join(ROOT,'data-quarantine',slug,tf+'.json');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination);}}
  const index=read('data/index.json');index.entries=index.entries.filter(e=>!policy.quarantined[e.ticker]);
  for(const quote of planned){const relative=`data/${quote.ticker.replaceAll(':','-')}/1d.json`;write(relative,quote);const entry=index.entries.find(e=>e.ticker===quote.ticker&&e.timeframe==='1d');Object.assign(entry,{fetchedAt:quote.fetchedAt,lastBarDate:quote.lastBarDate,barCount:quote.barCount});}
  index.updatedAt=audit.repaired_at;write('data/index.json',index);
  for(const quote of planned)persistAggregatesFromDaily(quote);
  write('data-repairs/2026-11-16-universe.json',audit);
  console.log(JSON.stringify(audit.series.map(e=>({ticker:e.ticker,status:e.status,changed:e.changed.length,added:e.added.length,removed:e.removed.length}))));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
