import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readDailyQuotes,assertQuoteIntegrity,integrityPolicy,barsHash} from './lib/universe-integrity.mjs';
import {aggregateWeekly,aggregateMonthly} from './lib/aggregate-ohlcv.mjs';
import {windowBars} from './validate-and-merge.mjs';
export function checkUniverse(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')) {
  const quotes=readDailyQuotes(root),policy=integrityPolicy(root),index=JSON.parse(fs.readFileSync(path.join(root,'data/index.json'),'utf8'));
  let count=0;
  for(const q of quotes){
    assertQuoteIntegrity(q,quotes,policy);
    for(const [tf,bars] of [['1d',q.ohlcv],['1w',windowBars(aggregateWeekly(q.ohlcv),'1w')],['1mo',windowBars(aggregateMonthly(q.ohlcv),'1mo')]]){
      const relative=`data/${q.ticker.replaceAll(':','-')}/${tf}.json`;
      const stored=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
      assertQuoteIntegrity(stored,[],policy);
      if(stored.ticker!==q.ticker||stored.timeframe!==tf||barsHash(stored.ohlcv)!==barsHash(bars)) throw new Error(`Derived data mismatch: ${relative}`);
      const entries=index.entries.filter(e=>e.ticker===q.ticker&&e.timeframe===tf);
      if(entries.length!==1||entries[0].path!==relative||entries[0].barCount!==stored.barCount||entries[0].lastBarDate!==stored.lastBarDate||entries[0].fetchedAt!==stored.fetchedAt) throw new Error(`Index mismatch: ${relative}`);
      count++;
    }
  }
  if(index.entries.length!==count) throw new Error('Index has missing, duplicate or quarantined entries');
  console.log(`Integrity OK: ${quotes.length} daily series, ${count} files; cross-symbol, prices, aggregates and index`);
  return {series:quotes.length,files:count};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) checkUniverse();
