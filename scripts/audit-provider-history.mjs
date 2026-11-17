/** Read-only full-universe audit. Invalid provider observations are evidence, never live quotes. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fetchQuote} from './fetch-quote.mjs';
import {batchHistoryOptions} from './lib/history-refresh.mjs';
export const digest = bars => createHash('sha256').update(JSON.stringify(bars)).digest('hex');
export const fields = ['date','open','high','low','close','volume'];
export const fingerprint = bar => fields.map(k=>bar[k]).join('|');
export function compareBars(before,after) {
  const old=new Map(before.map(b=>[b.date,b])), fresh=new Map(after.map(b=>[b.date,b]));
  return {removed:before.filter(b=>!fresh.has(b.date)),added:after.filter(b=>!old.has(b.date)),changed:before.filter(b=>fresh.has(b.date)&&fingerprint(b)!==fingerprint(fresh.get(b.date))).map(b=>({before:b,after:fresh.get(b.date)}))};
}
async function main() {
  const out='artifacts/universe-audit'; fs.mkdirSync(out,{recursive:true});
  const names=['AAPL-NASDAQ','HOOD-NASDAQ','NVDA-NASDAQ'];
  const quotes=names.map(s=>JSON.parse(fs.readFileSync(`data/${s}/1d.json`,'utf8')));
  const {timeframes}=JSON.parse(fs.readFileSync('config/timeframes.json','utf8'));
  const report={version:'1.0.0',verified_at:new Date().toISOString(),source_tags:['GoogleFinance:GOOGLEFINANCE','GoogleSheets:sheets.googleapis.com'],series:[]};
  for(const stored of quotes) {
    const slug=stored.ticker.replaceAll(':','-');
    const range=batchHistoryOptions(stored,timeframes['1d']);
    const entry={ticker:stored.ticker,...range,stored_count:stored.barCount,stored_sha256:digest(stored.ohlcv)};
    if(stored.ticker==='CRD:NTYSE') {entry.status='unresolved_identity'; entry.reason='Unknown NTYSE exchange; all 484 stored bars match 000660:KRX. Do not guess replacement.';}
    else try {
      const quote=await fetchQuote(stored.ticker,'1d',{...range,symbolCandidates:[stored.ticker.split(':').reverse().join(':')],onObservation:bars=>fs.writeFileSync(`${out}/${slug}.observation.json`,JSON.stringify(bars.filter(bar=>bar.date==='2024-10-15'),null,2)+'\n')});
      const changes=compareBars(stored.ohlcv,quote.ohlcv);
      fs.writeFileSync(`${out}/${slug}.json`,JSON.stringify(quote.ohlcv.filter(bar=>bar.date==='2024-10-15'),null,2)+'\n');
      Object.assign(entry,{status:'verified',resolved_symbol:quote.resolvedSymbol,fetched_count:quote.barCount,fetched_sha256:digest(quote.ohlcv),changed:changes.changed.length,removed:changes.removed.length,added:changes.added.length});
    } catch(error) {entry.status='provider_error'; entry.reason=/^(Invalid OHLC|GOOGLEFINANCE returned no parseable|Independent |Reviewed |Missing trading|Cross-symbol|Unreviewed price|Resolved symbol|Quote count)/.test(error.message)?error.message:'Provider request failed; no replacement accepted';}
    report.series.push(entry); fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ticker:entry.ticker,status:entry.status,changed:entry.changed,removed:entry.removed,added:entry.added,reason:entry.reason}));
  }
  if(process.env.AUDIT_REQUIRE_MATCH==='true'&&report.series.some(s=>s.status!=='verified'||s.changed||s.added||s.removed))throw new Error('Universe provider verification differs or is incomplete');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/audit-provider-history.mjs')) main().catch(()=>{console.error('Universe provider audit failed');process.exitCode=1;});
