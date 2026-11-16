import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertQuoteIntegrity,barsHash,crossSymbolMatches,integrityPolicy} from '../lib/universe-integrity.mjs';
import {applyReviewedCorrections} from '../lib/reviewed-corrections.mjs';
import {compareIndependent,parseIndependent,parseNaver,verifyIndependent} from '../lib/independent-prices.mjs';
const bar=(date,c=100)=>({date,open:c,high:c+1,low:c-1,close:c,volume:100});
const quote=(ticker,bars)=>({ticker,timeframe:'1d',resolvedSymbol:ticker.split(':').reverse().join(':'),ohlcv:bars,barCount:bars.length,lastBarDate:bars.at(-1).date});
const policy={quarantined:{'CRD:NTYSE':{reason:'foreign data'}},reviewedMoves:[],maxUnreviewedCloseChange:.4,providerCorrections:[],providerAdditions:[],nonTradingDates:[],independentExceptions:[],independentPriceTolerance:.02};
test('foreign OHLCV collisions and wrong identities fail before persistence',()=>{
  const bars=[bar('2026-11-10')],q=quote('AAPL:NASDAQ',bars),other=quote('000660:KRX',bars);
  assert.equal(crossSymbolMatches(q,[other]).length,1);
  assert.throws(()=>assertQuoteIntegrity(q,[other],policy),/collision/);
  assert.throws(()=>assertQuoteIntegrity(quote('CRD:NTYSE',bars),[],policy),/Quarantined/);
  assert.throws(()=>assertQuoteIntegrity({...q,resolvedSymbol:'NYSE:AAPL'},[],policy),/Resolved/);
});
test('split-like jumps block, genuine reviewed moves require the exact two bars',()=>{
  const bars=[bar('2026-11-10'),bar('2026-11-11',300)],q=quote('AAPL:NASDAQ',bars);
  assert.throws(()=>assertQuoteIntegrity(q,[],policy),/discontinuity/);
  const reviewed={...policy,reviewedMoves:[{ticker:q.ticker,sha256:barsHash(bars)}]};
  assert.doesNotThrow(()=>assertQuoteIntegrity(q,[],reviewed));
  q.ohlcv[1].volume++;assert.throws(()=>assertQuoteIntegrity(q,[],reviewed),/discontinuity/);
});
test('exact reviewed fixes are idempotent and reject a changed adjustment basis',()=>{
  const before=bar('2024-03-07',300),after=bar('2024-03-07',100),p={...policy,providerCorrections:[{id:'fix',symbol:'NASDAQ:SOXX',before,after}]};
  assert.deepEqual(applyReviewedCorrections([before],'NASDAQ:SOXX',p).bars,[after]);
  assert.deepEqual(applyReviewedCorrections([after],'NASDAQ:SOXX',p).applied,[]);
  assert.throws(()=>applyReviewedCorrections([bar(before.date,50)],'NASDAQ:SOXX',p),/no longer matches/);
});
test('AAPL full-session Google volume passes and the reviewed incomplete bar is corrected',()=>{
  const ticker='NASDAQ:AAPL';
  const complete={date:'2024-10-15',open:233.61,high:237.49,low:232.37,close:233.85,volume:64751367};
  const partial={date:complete.date,open:228.7,high:231.73,low:228.6,close:231.3,volume:954380};
  assert.deepEqual(applyReviewedCorrections([complete],ticker),{bars:[complete],applied:[]});
  assert.deepEqual(applyReviewedCorrections([partial],ticker),{
    bars:[complete],applied:['universe-v1-AAPL-NASDAQ-2024-10-15'],
  });
  assert.throws(()=>applyReviewedCorrections([{...complete,volume:complete.volume+1}],ticker),/no longer matches/);
});
test('missing-session insertion requires current neighbor evidence and respects request bounds',()=>{
  const a=bar('2026-11-09'),b=bar('2026-11-10'),c=bar('2026-11-11'),p={...policy,providerAdditions:[{symbol:'KRX:010120',id:'missing',bar:b,anchors:[a,c]}]};
  assert.deepEqual(applyReviewedCorrections([a,c],'KRX:010120',p).bars,[a,b,c]);
  assert.throws(()=>applyReviewedCorrections([{...a,close:100.5},c],'KRX:010120',p),/anchors/);
  assert.deepEqual(applyReviewedCorrections([c],'KRX:010120',p).bars,[c]);
});
test('independent checks reject hidden basis changes and missing trading sessions, excluding documented suspensions',()=>{
  const a=bar('2026-11-09'),b=bar('2026-11-10'),c=bar('2026-11-11');
  assert.throws(()=>compareIndependent('AAPL:NASDAQ',[bar(a.date,200)],[a],policy),/basis disagreement/);
  assert.throws(()=>compareIndependent('AAPL:NASDAQ',[a,c],[a,b,c],policy),/Missing trading/);
  assert.equal(compareIndependent('AAPL:NASDAQ',[a,c],[a,b,c],{...policy,nonTradingDates:[{ticker:'AAPL:NASDAQ',date:b.date}]}).checked,2);
});
test('independent missing or malformed prices are reported, never used to rewrite history',()=>{
  const bars=Array.from({length:100},(_,i)=>bar(new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10)));
  const ref=structuredClone(bars);ref[0].close=1000;
  assert.throws(()=>compareIndependent('AAPL:NASDAQ',bars,ref,policy),/coverage incomplete/);
  ref[1].open=null;assert.throws(()=>compareIndependent('AAPL:NASDAQ',bars,ref,policy),/coverage incomplete/);
  assert.throws(()=>parseIndependent({chart:{result:[{meta:{symbol:'OTHER'},timestamp:[1]}]}},'AAPL'),/identity/);
});
test('malformed Korean reference uses identified Naver data and blocks any remaining gap',async()=>{
  const b=bar('2026-11-10'),yahoo={chart:{result:[{meta:{symbol:'000660.KS'},timestamp:[Date.parse(b.date)/1000],indicators:{quote:[{open:[100],high:[101],low:[99],close:[1000],volume:[100]}]}}]}};
  const xml='<chartdata symbol="000660"><item data="20261110|100|101|99|100|100" /></chartdata>';
  let calls=0;const fetchImpl=async url=>{calls++;return url.includes('yahoo.com')?{ok:true,json:async()=>yahoo}:{ok:true,text:async()=>xml};};
  const result=await verifyIndependent('000660:KRX',[b],{policy,fetchImpl});assert.equal(calls,2);assert.equal(result.checked,1);assert.deepEqual(result.domestic_fallback_dates,[b.date]);assert.ok(result.source_tags.includes('Validation:fchart.stock.naver.com'));
  assert.throws(()=>parseNaver(xml,'005930'),/identity/);
  await assert.rejects(verifyIndependent('000660:KRX',[b],{policy,fetchImpl:async url=>url.includes('yahoo.com')?{ok:true,json:async()=>yahoo}:{ok:true,text:async()=>xml.replace('|100|101|99|100|','|100|101|99|1000|')}}),/coverage|No usable/);
});
test('independent network failures fail closed instead of silently blessing a quote',async()=>{
  await assert.rejects(verifyIndependent('AAPL:NASDAQ',[bar('2026-11-10')],{policy,fetchImpl:async()=>({ok:false,status:429})}),/unavailable/);
});
test('all committed corrections retain evidence and SOXX split-day prices stay in the surrounding basis',()=>{
  const p=integrityPolicy();assert.ok(p.providerCorrections.length>=15);
  for(const correction of p.providerCorrections){assert.ok(correction.sources.length);assert.ok(correction.reason);assert.equal(correction.before.date,correction.after.date);}
  const q=JSON.parse(fs.readFileSync(new URL('../../data/SOXX-NASDAQ/1d.json',import.meta.url)));
  assert.equal(q.ohlcv.find(b=>b.date==='2024-03-07').close,79.25);
  assert.equal(q.data_recovery.id,'universe-history-2026-11-16-v1');
});
