import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aggregateWeekly, aggregateMonthly } from '../lib/aggregate-ohlcv.mjs';
import { repairSoxx, HOLIDAYS, REPAIR_ID } from '../repair-soxx-history.mjs';
import { digest } from '../repair-soxx-history.mjs';
import { reconcileProvider } from '../reconcile-soxx-provider.mjs';
const b=(date,close=100)=>({date,open:close,high:close+1,low:close-1,close,volume:123});
const foreign=HOLIDAYS.map(date=>b(date,100000));
const good=[b('2024-08-30'),b('2026-11-12')];
const quote={ticker:'SOXX:NASDAQ',timeframe:'1d',fetchedAt:'2026-11-13T17:10:25.560Z',ohlcv:[...foreign,...good].sort((a,b)=>a.date.localeCompare(b.date)),barCount:17};
const witness={ticker:'009150:KRX',ohlcv:foreign};
test('recovery removes only exact foreign bars on verified closures and preserves valid history',()=>{
  const r=repairSoxx(quote,witness,'2026-11-16');assert.deepEqual(r.quote.ohlcv,good);assert.equal(r.quote.fetchedAt,quote.fetchedAt);assert.equal(r.audit.removed_bars.length,15);assert.equal(r.quote.data_recovery.id,REPAIR_ID);
  const again=repairSoxx(r.quote,witness);assert.equal(again.audit,null);assert.deepEqual(again.quote,r.quote);
});
test('changed evidence or another ticker cannot trigger automatic deletions',()=>{
  const different=structuredClone(witness);different.ohlcv[0].volume++;
  assert.throws(()=>repairSoxx(quote,different),/evidence changed/);
  assert.throws(()=>repairSoxx({...quote,ticker:'AAPL:NASDAQ'},witness),/identity/);
  assert.throws(()=>repairSoxx({...quote,ohlcv:[...quote.ohlcv,b('2026-11-13',100000)]},{...witness,ohlcv:[...foreign,b('2026-11-13',100000)]}),/evidence changed/);
});
test('committed SOXX history has no verified foreign holidays and derived bars match daily data',()=>{
  const read=rel=>JSON.parse(fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8'));
  const daily=read('data/SOXX-NASDAQ/1d.json');
  assert.equal(daily.ohlcv.some(b=>HOLIDAYS.includes(b.date)),false);
  const config=read('config/timeframes.json').timeframes;
  for(const [tf,aggregate] of [['1w',aggregateWeekly],['1mo',aggregateMonthly]]) {
    const expected=aggregate(daily.ohlcv).slice(-config[tf].maxBars);
    assert.deepEqual(read(`data/SOXX-NASDAQ/${tf}.json`).ohlcv,expected);
  }
});
test('provider reconciliation accepts reviewed split basis without locally inventing prices',()=>{
  const fresh={ticker:'SOXX:NASDAQ',timeframe:'1d',source:'google_sheets_googfinance',resolvedSymbol:'NASDAQ:SOXX',collection_version:'2.0.0',ohlcv:[b('2024-11-08',100),b('2026-11-12',100)]};
  const old=structuredClone(fresh);old.data_recovery={id:REPAIR_ID,after_sha256:'old'};
  for(const field of ['open','high','low','close'])old.ohlcv[0][field]*=3;
  const r=reconcileProvider(old,fresh,{fetched_sha256:digest(fresh.ohlcv)});
  assert.equal(r.changes.length,1);assert.deepEqual(r.quote.ohlcv,fresh.ohlcv);
  const missing=structuredClone(fresh);missing.ohlcv.pop();assert.throws(()=>reconcileProvider(old,missing,{fetched_sha256:digest(missing.ohlcv)}),/dates/);
  old.ohlcv[0].close+=10;assert.throws(()=>reconcileProvider(old,fresh,{fetched_sha256:digest(fresh.ohlcv)}),/Unreviewed/);
});
