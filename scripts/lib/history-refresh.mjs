import {execFileSync} from 'node:child_process';
/** Restore only a committed same-instrument baseline; the caller must refetch and
 * validate it before writing. Recovery lineage must survive a missing file. */
export function committedHistory(root,relative,ticker,timeframe,readCommit=(cwd,rel)=>execFileSync('git',['-C',cwd,'show',`HEAD:${rel}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']})) {
  let quote;
  try{quote=JSON.parse(readCommit(root,relative));}catch{throw new Error('Missing daily file has no readable committed recovery baseline');}
  if(quote.ticker!==ticker||quote.timeframe!==timeframe||!quote.ohlcv?.length)throw new Error('Invalid committed history identity');
  return quote;
}
/** Refresh the entire retained history so old and recent split adjustments cannot mix. */
export function historyRefreshOptions(existing,config,now=new Date()) {
  if(!existing?.ohlcv?.length) return {};
  const end=now.toISOString().slice(0,10);
  const cutoff=new Date(`${end}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate()-config.sheetsLookbackDays);
  const start=[existing.ohlcv[0].date,cutoff.toISOString().slice(0,10)].sort().at(-1);
  return {start,end};
}

export function assertHistoryCoverage(existing,incoming,{start,end}) {
  if(!start||!end) return;
  const dates=new Set(incoming.map(b=>b.date));
  const missing=existing.filter(b=>b.date>=start&&b.date<=end&&!dates.has(b.date));
  if(missing.length) throw new Error(`Full-history refresh missing ${missing.length} stored dates; explicit data repair required`);
}

/** Batch audits also cover a missing leading segment and an entirely missing file.
 * Include every stored date, including a few days before the wall-clock cutoff,
 * so no retained bar can silently keep a different split basis. */
export function batchHistoryOptions(existing,config,now=new Date()) {
  const end=now.toISOString().slice(0,10),cutoff=new Date(`${end}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate()-config.sheetsLookbackDays);
  const dates=[cutoff.toISOString().slice(0,10)];
  if(existing?.ohlcv?.length)dates.push(existing.ohlcv[0].date);
  return {start:dates.sort()[0],end};
}
