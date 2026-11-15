import {assertFetchedBars} from './quote-quality.mjs';
import {integrityPolicy} from './universe-integrity.mjs';
export function yahooSymbol(ticker) {
  const [sym,ex]=ticker.split(':');
  if(['KRX','KOSPI','KOSDAQ'].includes(ex)) return sym==='KOSPI'?'^KS11':sym==='KOSDAQ'?'^KQ11':`${sym}.${ex==='KOSDAQ'?'KQ':'KS'}`;
  if(ex==='INDEXNASDAQ'&&sym==='NDX') return '^NDX';
  if(ex==='INDEXDJX'&&sym==='DJI') return '^DJI';
  if(ex==='INDEXSP'&&sym==='SPX') return '^GSPC';
  if(ex==='HKG') return `${sym.padStart(4,'0')}.HK`;
  if(['NASDAQ','NYSE','NYSEARCA','NYSEAMERICAN','BATS'].includes(ex)) return sym;
  throw new Error(`Independent symbol mapping required: ${ticker}`);
}
export function parseIndependent(raw,expectedSymbol) {
  const result=raw.chart?.result?.[0];
  if(!result||result.meta?.symbol!==expectedSymbol||!result.timestamp?.length) throw new Error('Independent provider identity or response mismatch');
  const q=result.indicators?.quote?.[0];
  if(!q) throw new Error('Independent prices unavailable');
  return result.timestamp.map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),...Object.fromEntries(['open','high','low','close','volume'].map(k=>[k,q[k]?.[i]??null]))}));
}
export const priceKey=b=>['date','open','high','low','close'].map(k=>typeof b[k]==='number'?b[k].toFixed(2):b[k]).join('|');
export function usableReference(other,primary) {
  try{if(!other||(other.volume===0&&other.open===other.high&&other.high===other.low&&other.low===other.close&&primary.high!==primary.low))return false;assertFetchedBars([other]);return true;}catch{return false;}
}
export function parseNaver(xml,symbol) {
  const actual=xml.match(/<chartdata\b[^>]*\bsymbol="([^"]+)"/)?.[1];
  if(actual!==symbol)throw new Error('Independent domestic provider identity mismatch');
  const bars=[...xml.matchAll(/<item\s+data="(\d{8}\|[^"]+)"/g)].map(m=>m[1].split('|')).filter(v=>v.length===6).map(([d,...v])=>({date:d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8),...Object.fromEntries(['open','high','low','close','volume'].map((k,i)=>[k,Number(v[i])]))}));
  if(!bars.length)throw new Error('Independent domestic prices unavailable');
  return bars;
}
export function compareIndependent(ticker,bars,reference,policy=integrityPolicy()) {
  const ref=new Map(reference.map(b=>[b.date,b]));
  const result={checked:0,unavailable:[],reviewed_disagreements:[],source_tags:['Validation:query1.finance.yahoo.com']};
  for(const b of bars) {
    const other=ref.get(b.date);
    // Never use malformed independent prices to rewrite a valid primary observation.
    if(!usableReference(other,b)){result.unavailable.push(b.date);continue;}
    const mismatch=['open','high','low','close'].some(k=>Math.abs(b[k]-other[k])>Math.max(.025,Math.abs(other[k])*policy.independentPriceTolerance));
    if(mismatch){
      const reviewed=policy.independentExceptions.some(e=>e.ticker===ticker&&e.primary===priceKey(b)&&e.independent===priceKey(other));
      if(!reviewed) throw new Error(`Independent price/basis disagreement: ${ticker} ${b.date}`);
      result.reviewed_disagreements.push(b.date);
    } else result.checked++;
  }
  const first=bars[0].date,last=bars.at(-1).date,dates=new Set(bars.map(b=>b.date));
  const absent=reference.filter(b=>b.date>=first&&b.date<=last&&!dates.has(b.date)).filter(b=>!policy.nonTradingDates?.some(e=>e.ticker===ticker&&e.date===b.date)).filter(b=>{try{assertFetchedBars([b]);return true;}catch{return false;}});
  if(absent.length) throw new Error(`Missing trading dates confirmed by independent provider: ${ticker} ${absent.length} (${absent[0].date})`);
  if(!result.checked) throw new Error('No usable independent price coverage');
  if(result.unavailable.length) throw new Error('Independent price coverage incomplete');
  return result;
}
export async function verifyIndependent(ticker,bars,{fetchImpl=fetch,policy=integrityPolicy()}={}) {
  const symbol=yahooSymbol(ticker),start=Date.parse(bars[0].date)/1000,end=Date.parse(bars.at(-1).date)/1000+86400;
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=splits`;
  const response=await fetchImpl(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`Independent price verification unavailable (HTTP ${response.status})`);
  const reference=parseIndependent(await response.json(),symbol),byDate=new Map(reference.map(b=>[b.date,b]));
  const missing=bars.filter(b=>!usableReference(byDate.get(b.date),b));
  const fallback=[];
  if(missing.length&&['KRX','KOSPI','KOSDAQ'].includes(ticker.split(':')[1])){
    const domesticSymbol=ticker.split(':')[0];
    const domesticResponse=await fetchImpl(`https://fchart.stock.naver.com/sise.nhn?symbol=${encodeURIComponent(domesticSymbol)}&timeframe=day&count=1500&requestType=0`,{signal:AbortSignal.timeout(30000)});
    if(!domesticResponse.ok)throw new Error(`Independent domestic verification unavailable (HTTP ${domesticResponse.status})`);
    const domestic=new Map(parseNaver(await domesticResponse.text(),domesticSymbol).map(b=>[b.date,b]));
    for(const b of missing){const other=domestic.get(b.date);if(usableReference(other,b)){byDate.set(b.date,other);fallback.push(b.date);}}
  }
  const result=compareIndependent(ticker,bars,[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)),policy);
  if(fallback.length){result.source_tags.push('Validation:fchart.stock.naver.com');result.domestic_fallback_dates=fallback;}
  return {...result,verified_at:new Date().toISOString()};
}
