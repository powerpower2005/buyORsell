import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runScheduledStaleRefresh,historyChanges,buildMarkdown} from '../scheduled-stale-refresh.mjs';
import {batchHistoryOptions,committedHistory} from '../lib/history-refresh.mjs';
const bar=date=>({date,open:100,high:101,low:99,close:100,volume:123});
const quote=(ticker,dates)=>({ticker,timeframe:'1d',ohlcv:dates.map(bar),barCount:dates.length,lastBarDate:dates.at(-1),source_tags:['GoogleFinance:GOOGLEFINANCE']});
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'daily-audit-'));t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));assert.ok(path.basename(root).startsWith('daily-audit-'));fs.rmSync(root,{recursive:true,force:true});});const write=(rel,obj)=>{fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),JSON.stringify(obj));};write('config/timeframes.json',{timeframes:{'1d':{enabled:true},'1w':{enabled:true,aggregateFrom:'1d'},'1mo':{enabled:true,aggregateFrom:'1d'}}});return {root,write};}
const policy={quarantined:{'CRD:NTYSE':{reason:'identity quarantine'}}};
test('fresh data with an internal hole is fetched once per ticker, then aggregates are restored',async t=>{
  const {root,write}=fixture(t),ticker='AAPL:NASDAQ',before=quote(ticker,['2026-11-10','2026-11-12']);
  write('data/index.json',{entries:['1d','1w','1mo'].map(timeframe=>({ticker,timeframe}))});write('data/AAPL-NASDAQ/1d.json',before);
  const calls=[];const after=quote(ticker,['2026-11-10','2026-11-11','2026-11-12','2026-11-13']);
  const result=await runScheduledStaleRefresh({root,policy,pipeline:async args=>{calls.push(args);for(const tf of ['1d','1w','1mo'])write(`data/AAPL-NASDAQ/${tf}.json`,after);return {quote:after};}});
  assert.deepEqual(calls,[{ticker,timeframe:'1d',force:true,fullHistory:true}]);assert.equal(result.totals.historicalAdded,1);assert.equal(result.totals.newBars,1);assert.equal(result.totals.restoredFiles,2);assert.equal(result.complete,true);
  assert.deepEqual(result.series[0].historical_added_dates,['2026-11-11']);
});
test('a missing daily file is attempted, quarantines excluded, failures visible and batch not committable',async t=>{
  const {root,write}=fixture(t);write('data/index.json',{entries:[{ticker:'AAPL:NASDAQ',timeframe:'1d'},{ticker:'CRD:NTYSE',timeframe:'1d'},{ticker:'TSLA:NASDAQ',timeframe:'1mo'}]});
  const calls=[];const result=await runScheduledStaleRefresh({root,policy,pipeline:async args=>{calls.push(args.ticker);if(args.ticker==='AAPL:NASDAQ')throw Error('Independent price coverage incomplete');const q=quote(args.ticker,['2026-11-12']);for(const tf of ['1d','1w','1mo'])write(`data/TSLA-NASDAQ/${tf}.json`,q);return {quote:q};}});
  assert.deepEqual(calls,['AAPL:NASDAQ','TSLA:NASDAQ']);assert.equal(result.complete,false);assert.equal(result.totals.failed,1);assert.equal(result.totals.checked,1);assert.equal(result.totals.excluded,1);assert.equal(result.totals.restoredFiles,3);assert.match(buildMarkdown(result),/커밋하지 않습니다/);
});
test('empty and mismatched provider responses require a fresh, fully verified batch request', async t => {
  const {root,write}=fixture(t),ticker='NVDA:NASDAQ';
  write('data/index.json',{entries:[{ticker,timeframe:'1d'}]});
  const failures=['GOOGLEFINANCE returned no parseable OHLCV rows', 'Independent price/basis disagreement: NVDA:NASDAQ 2024-10-15'];
  const args=[];
  const result=await runScheduledStaleRefresh({root,policy,pipeline:async options=>{
    args.push(options);
    if (failures.length) throw new Error(failures.shift());
    const verified=quote(ticker,['2026-11-16']);
    for(const tf of ['1d','1w','1mo']) write(`data/NVDA-NASDAQ/${tf}.json`,verified);
    return {quote:verified};
  }});
  assert.deepEqual(args, Array.from({length:3},()=>({ticker,timeframe:'1d',force:true,fullHistory:true})));
  assert.equal(result.series[0].attempts,3);
  assert.equal(result.complete,true);
});
test('persistent independent price disagreement leaves the batch uncommittable after the retry limit', async t => {
  const {root,write}=fixture(t),ticker='NVDA:NASDAQ';
  write('data/index.json',{entries:[{ticker,timeframe:'1d'}]});
  const before=quote(ticker,['2026-11-13']);
  write('data/NVDA-NASDAQ/1d.json',before);
  const result=await runScheduledStaleRefresh({root,policy,pipeline:async()=>{
    throw new Error('Independent price/basis disagreement: NVDA:NASDAQ 2024-10-15');
  }});
  assert.equal(result.series[0].attempts,3);
  assert.equal(result.totals.checked,0);
  assert.equal(result.complete,false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'data/NVDA-NASDAQ/1d.json'),'utf8')),before);
});
test('non-trading dates are not invented and revisions are distinguished from added dates',()=>{
  const before=quote('AAPL:NASDAQ',['2026-11-06','2026-11-09']),after=structuredClone(before);after.ohlcv[1].volume++;
  assert.deepEqual(historyChanges(before,after),{historical_added_dates:[],new_dates:[],revised_dates:['2026-11-09']});
});
test('batch range covers the full retention window and every already-retained split basis',()=>{
  const now=new Date('2026-11-16'),config={sheetsLookbackDays:1500};
  const empty=batchHistoryOptions(null,config,now);assert.equal((Date.parse(empty.end)-Date.parse(empty.start))/86400000,1500);
  assert.deepEqual(batchHistoryOptions(quote('AAPL:NASDAQ',['2026-11-12']),config,now),empty);
  assert.equal(batchHistoryOptions(quote('PLTR:NASDAQ',['2022-10-04','2026-11-12']),config,now).start,'2022-10-04');
});
test('committed recovery metadata survives missing-file restoration, mismatched identities fail',()=>{
  const original={...quote('SOXX:NASDAQ',['2026-11-12']),data_recovery:{id:'reviewed-v2'},fetchedAt:'2026-11-13T00:00:00Z'};
  assert.deepEqual(committedHistory('root','data/SOXX-NASDAQ/1d.json','SOXX:NASDAQ','1d',()=>JSON.stringify(original)),original);
  assert.throws(()=>committedHistory('root','file','AAPL:NASDAQ','1d',()=>JSON.stringify(original)),/identity/);
  assert.throws(()=>committedHistory('root','file','SOXX:NASDAQ','1d',()=>{throw Error('missing');}),/no readable/);
});
