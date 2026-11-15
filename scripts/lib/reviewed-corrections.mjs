import {integrityPolicy, fingerprint} from './universe-integrity.mjs';
/** Exact evidence-backed corrections only. New price bases must be reviewed again. */
export function applyReviewedCorrections(bars,symbol,policy=integrityPolicy(),range={}) {
  const applicable=policy.providerCorrections.filter(c=>c.symbol===symbol);
  const applied=[];
  const corrected=bars.map(bar=>{
    const correction=applicable.find(c=>c.before.date===bar.date);
    if(!correction) return bar;
    if(fingerprint(bar)===fingerprint(correction.after)) return bar;
    if(fingerprint(bar)!==fingerprint(correction.before)) throw new Error(`Reviewed correction no longer matches provider: ${symbol} ${bar.date}`);
    applied.push(correction.id); return {...correction.after};
  });
  const start=range.start?.toISOString().slice(0,10)??bars[0]?.date,end=range.end?.toISOString().slice(0,10)??bars.at(-1)?.date;
  for(const addition of policy.providerAdditions??[]){
    if(addition.symbol!==symbol||addition.bar.date<start||addition.bar.date>end)continue;
    const current=corrected.find(b=>b.date===addition.bar.date);
    if(current){if(fingerprint(current)!==fingerprint(addition.bar))throw new Error(`Reviewed addition changed: ${symbol} ${addition.bar.date}`);continue;}
    if(!addition.anchors.every(anchor=>corrected.some(b=>fingerprint(b)===fingerprint(anchor))))throw new Error(`Reviewed addition requires unchanged full-history anchors: ${symbol} ${addition.bar.date}`);
    corrected.push({...addition.bar});applied.push(addition.id);
  }
  corrected.sort((a,b)=>a.date.localeCompare(b.date));
  return {bars:corrected,applied};
}
