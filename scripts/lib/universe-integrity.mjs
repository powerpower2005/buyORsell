import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assertFetchedBars} from './quote-quality.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const fields=['date','open','high','low','close','volume'];
export const fingerprint=b=>fields.map(k=>b[k]??0).join('|');
export const barsHash=bars=>createHash('sha256').update(JSON.stringify(bars)).digest('hex');
export function integrityPolicy(root=ROOT){return JSON.parse(fs.readFileSync(path.join(root,'config/collection-integrity.json'),'utf8'));}
export function assertCollectible(ticker,policy=integrityPolicy()) {
  if(policy.quarantined[ticker]) throw new Error(`Quarantined instrument ${ticker}: ${policy.quarantined[ticker].reason}`);
  if(!/^[A-Z0-9.]+:(NASDAQ|NYSE|NYSEARCA|BATS|NYSEAMERICAN|KRX|KOSDAQ|KOSPI|INDEXNASDAQ|INDEXDJX|INDEXSP|HKG)$/.test(ticker)) throw new Error(`Unsupported instrument identity: ${ticker}`);
}
export function crossSymbolMatches(quote,others) {
  const signatures=new Set(quote.ohlcv.map(fingerprint));
  return others.filter(q=>q.ticker!==quote.ticker).flatMap(q=>q.ohlcv.filter(b=>signatures.has(fingerprint(b))).map(b=>({ticker:q.ticker,date:b.date})));
}
export function assertQuoteIntegrity(quote,others=[],policy=integrityPolicy()) {
  assertCollectible(quote.ticker,policy); assertFetchedBars(quote.ohlcv);
  if(quote.barCount!==quote.ohlcv.length||quote.lastBarDate!==quote.ohlcv.at(-1).date) throw new Error('Quote count or last date mismatch');
  if(quote.timeframe!=='1d') return;
  if(quote.resolvedSymbol!==quote.ticker.split(':').reverse().join(':')) throw new Error('Resolved symbol does not match requested exchange and ticker');
  const matches=crossSymbolMatches(quote,others.filter(q=>!policy.quarantined[q.ticker]));
  if(matches.length) throw new Error(`Cross-symbol OHLCV collision: ${matches[0].ticker} ${matches[0].date} (${matches.length} rows)`);
  for(let i=1;i<quote.ohlcv.length;i++){
    const pair=quote.ohlcv.slice(i-1,i+1);
    if(Math.abs(pair[1].close/pair[0].close-1)>policy.maxUnreviewedCloseChange && !policy.reviewedMoves.some(r=>r.ticker===quote.ticker&&r.sha256===barsHash(pair))) throw new Error(`Unreviewed price discontinuity: ${quote.ticker} ${pair[1].date}; verify split basis or genuine move`);
  }
}
export function readDailyQuotes(root=ROOT) {
  return fs.readdirSync(path.join(root,'data')).filter(s=>fs.existsSync(path.join(root,'data',s,'1d.json'))).map(s=>JSON.parse(fs.readFileSync(path.join(root,'data',s,'1d.json'),'utf8')));
}
export function assertStoredQuote(quote,root=ROOT){assertQuoteIntegrity(quote,readDailyQuotes(root),integrityPolicy(root));}
