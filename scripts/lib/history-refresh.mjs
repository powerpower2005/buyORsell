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
