import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchBarsInIsolatedSheet, allFormula } from '../lib/sheets-bars.mjs';
import { assertFetchedBars } from '../lib/quote-quality.mjs';
import { parseGoogFinanceAllTable } from '../lib/goog-finance-parse.mjs';
import { mergeOhlcv } from '../validate-and-merge.mjs';
import { historyRefreshOptions, assertHistoryCoverage } from '../lib/history-refresh.mjs';

const cfg={formulaSep:',',poll:{initialWaitSec:0,attempts:2,sleepSec:0,fast:{maxSpanDays:14,initialWaitSec:0,attempts:2,sleepSec:0},medium:{maxSpanDays:90,initialWaitSec:0,attempts:2,sleepSec:0}}};
const header=['Date','Open','High','Low','Close','Volume'];
const us=['2026-06-18',210,215,209,213.15,100];
const kr=['2026-06-19',2280000,2417000,2169000,2270000,1728303];
const start=new Date('2026-06-18'),end=new Date('2026-06-19');
function mockSheets({rows,failCreate=false,failRead=false}={}) {
  const allocated=new Map(),calls=[];
  const sheets={spreadsheets:{batchUpdate:async request=>{
    const reqs=request.requestBody.requests;calls.push(reqs);
    if(reqs[0].addSheet){if(failCreate)throw Error('creation failed');const p=reqs[0].addSheet.properties;assert.equal(reqs[1].updateCells.start.sheetId,p.sheetId);allocated.set(p.title,{...p,formula:reqs[1].updateCells.rows[0].values[0].userEnteredValue.formulaValue});}
    else {const id=reqs[0].deleteSheet.sheetId;const hit=[...allocated.entries()].find(([,p])=>p.sheetId===id);assert.ok(hit,'delete only owned sheet');allocated.delete(hit[0]);}
    return {data:{}};
  },values:{batchGet:async request=>{
    if(failRead)throw Error('read failed');const title=request.ranges[0].split("'")[1];const owned=allocated.get(title);assert.ok(owned);
    const table=rows??[header,owned.formula.includes('NASDAQ:SOXX')?us:kr];
    return {data:{valueRanges:[{values:table}]}};
  }}}};return {sheets,allocated,calls};
}
const fetchWith=(mock,symbol='NASDAQ:SOXX',dates={start,end})=>fetchBarsInIsolatedSheet({sheets:mock.sheets,spreadsheetId:'test',cfg,symbol,...dates,sleepImpl:async()=>{}});

test('shared-cell race and additive merge reproduce the observed holiday pollution',()=>{
  let shared=[header,us]; // SOXX requests its formula, then another job overwrites Z1.
  shared=[header,kr];
  const stolen=parseGoogFinanceAllTable(shared);
  const existing=mergeOhlcv(parseGoogFinanceAllTable([header,us]),stolen).ohlcv;
  const refreshed=mergeOhlcv(existing,parseGoogFinanceAllTable([header,us])).ohlcv;
  assert.equal(refreshed.length,2);assert.equal(refreshed[1].close,2270000);
});
test('overlapping symbol requests read different worksheets and clean up only their own',async()=>{
  const m=mockSheets();const [soxx,samsung]=await Promise.all([fetchWith(m),fetchWith(m,'KRX:009150')]);
  assert.equal(soxx[0].close,213.15);assert.equal(samsung[0].close,2270000);
  const allocations=m.calls.filter(r=>r[0].addSheet).map(r=>r[0].addSheet.properties);
  assert.equal(new Set(allocations.map(p=>p.title)).size,2);assert.equal(new Set(allocations.map(p=>p.sheetId)).size,2);assert.equal(m.allocated.size,0);
});
test('empty/loading or partially malformed tables cannot silently become successful history',async()=>{
  for(const rows of [[['N/A']],[header,us,['2026-06-19','#N/A',1,1,1,1]]]) {
    const m=mockSheets({rows});await assert.rejects(fetchWith(m),/no parseable|Unparseable/);assert.equal(m.allocated.size,0);
  }
});
test('invalid bounds, duplicate dates and out-of-request data are rejected',async()=>{
  for(const rows of [[header,['2026-06-18',210,215,211,213,100]],[header,us,us],[header,['2020-01-01',1,2,1,2,1]]]) {
    const m=mockSheets({rows});await assert.rejects(fetchWith(m),/bounds|mismatch/);assert.equal(m.allocated.size,0);
  }
});
test('allocation/read failures do not delete an unrelated worksheet',async()=>{
  const create=mockSheets({failCreate:true});await assert.rejects(fetchWith(create),/creation/);assert.equal(create.calls.length,1);
  const read=mockSheets({failRead:true});await assert.rejects(fetchWith(read),/read failed/);assert.equal(read.allocated.size,0);
});
test('long history receives enough grid rows and semicolon formulas are consistent',async()=>{
  const m=mockSheets();await fetchWith(m,'NASDAQ:SOXX',{start:new Date('2022-01-01'),end});
  assert.ok(m.calls[0][0].addSheet.properties.gridProperties.rowCount>700);
  assert.equal(allFormula('NASDAQ:SOXX',start,end,';'),'=IFERROR(GOOGLEFINANCE("NASDAQ:SOXX";"all";DATE(2026;6;18);DATE(2026;6;19));"N/A")');
  assert.throws(()=>allFormula('SOXX"',start,end),/symbol/);
});
test('non-finite prices and impossible dates are rejected',()=>{
  for(const bar of [{date:'2026-02-30',open:1,high:2,low:1,close:2},{date:'2026-06-18',open:Infinity,high:2,low:1,close:2}]) assert.throws(()=>assertFetchedBars([bar]),/Invalid/);
});
test('refresh reaches the oldest retained bar instead of a fixed two-year window',()=>{
  const existing={ohlcv:[{date:'2022-12-12'},{date:'2026-11-12'}]};
  const range=historyRefreshOptions(existing,{sheetsLookbackDays:1500},new Date('2026-11-16'));
  assert.equal(range.start,'2022-12-12');assert.equal(range.end,'2026-11-16');
  const bounded=historyRefreshOptions({ohlcv:[{date:'2000-01-01'}]},{sheetsLookbackDays:1500},new Date('2026-11-16'));
  assert.equal((Date.parse(range.end)-Date.parse(bounded.start))/86400000,1500);
  assert.throws(()=>assertHistoryCoverage(existing.ohlcv,[{date:'2026-11-12'}],range),/missing 1/);
  assert.doesNotThrow(()=>assertHistoryCoverage(existing.ohlcv,existing.ohlcv,range));
});
