/** Provider verification only: no data/ writes or commits. Credentials stay in Actions. */
import fs from 'node:fs';
import { fetchQuote } from './fetch-quote.mjs';
import { digest, HOLIDAYS, REPAIR_ID } from './repair-soxx-history.mjs';

async function main() {
  const stored=JSON.parse(fs.readFileSync('data/SOXX-NASDAQ/1d.json','utf8'));
  if(!stored.data_recovery?.id) throw new Error('SOXX recovery snapshot is required');
  const fetched=await fetchQuote('SOXX:NASDAQ','1d',{start:stored.ohlcv[0].date,end:stored.lastBarDate,symbolCandidates:['NASDAQ:SOXX']});
  const incoming=new Map(fetched.ohlcv.map(b=>[b.date,b]));
  const saved=new Map(stored.ohlcv.map(b=>[b.date,b]));
  const fields=['open','high','low','close','volume'];
  const differing=stored.ohlcv.filter(b=>!incoming.has(b.date)||fields.some(k=>b[k]!==incoming.get(b.date)[k])).map(b=>b.date);
  const extra=fetched.ohlcv.filter(b=>!saved.has(b.date)).map(b=>b.date);
  const polluted=fetched.ohlcv.filter(b=>HOLIDAYS.includes(b.date)).map(b=>b.date);
  const report={verified_at:new Date().toISOString(),repair_id:stored.data_recovery.id,source_tags:fetched.source_tags,collection_version:fetched.collection_version,resolved_symbol:fetched.resolvedSymbol,start:stored.ohlcv[0].date,end:stored.lastBarDate,stored_count:stored.barCount,fetched_count:fetched.barCount,stored_sha256:digest(stored.ohlcv),fetched_sha256:digest(fetched.ohlcv),different_dates:differing,extra_dates:extra,closed_session_dates:polluted,match:!differing.length&&!extra.length&&!polluted.length};
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/soxx-provider-verification.json',JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync('artifacts/soxx-provider-quote.json',JSON.stringify(fetched,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(!report.match) throw new Error('SOXX provider verification differs; review before re-enabling tracking');
}
main().catch(error=>{console.error(error.message?.startsWith('SOXX ')?error.message:'SOXX provider verification failed; inspect credential configuration or provider availability.');process.exitCode=1;});
