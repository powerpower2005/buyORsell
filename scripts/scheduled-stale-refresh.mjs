#!/usr/bin/env node
/** Every batch audits complete daily history, even when the latest bar is fresh. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runFetchPipeline} from './validate-and-merge.mjs';
import {integrityPolicy} from './lib/universe-integrity.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fields=['open','high','low','close','volume'];
export function historyChanges(before,after) {
  const old=new Map((before?.ohlcv??[]).map(b=>[b.date,b]));
  const added=after.ohlcv.filter(b=>!old.has(b.date)).map(b=>b.date);
  return {
    historical_added_dates:before?added.filter(d=>d<=before.lastBarDate):[],
    new_dates:before?added.filter(d=>d>before.lastBarDate):[],
    revised_dates:after.ohlcv.filter(b=>old.has(b.date)&&fields.some(k=>old.get(b.date)[k]!==b[k])).map(b=>b.date),
  };
}
function safeReason(error){return /^(Invalid |Independent |Reviewed |Missing |Cross-symbol |Unreviewed |Resolved |Quote |Full-history |GOOGLEFINANCE returned|Quarantined |Unsupported |No bars)/.test(error.message)?error.message:'Collection or validation failed; no batch data committed';}
export async function runScheduledStaleRefresh({root=ROOT,pipeline=runFetchPipeline,policy=integrityPolicy(root)}={}) {
  const index=read(path.join(root,'data/index.json'));
  if(!Array.isArray(index.entries)||!index.entries.length)throw new Error('Missing or empty data index');
  const tickers=[...new Set(index.entries.map(e=>e.ticker))].sort();
  const timeframes=read(path.join(root,'config/timeframes.json')).timeframes;
  const tfs=['1d',...Object.entries(timeframes).filter(([,c])=>c.enabled&&c.aggregateFrom==='1d').map(([tf])=>tf)];
  const report={version:'2.1.0',mode:'full-history-batch',ranAt:new Date().toISOString(),source_tags:[],totals:{scanned:0,checked:0,failed:0,excluded:0,restoredFiles:0,historicalAdded:0,newBars:0,revisedBars:0},series:[]};
  for(const ticker of tickers){
    if(policy.quarantined[ticker]){report.totals.excluded++;report.series.push({ticker,status:'excluded',reason:policy.quarantined[ticker].reason});continue;}
    report.totals.scanned++;
    const slug=ticker.replaceAll(':','-'),file=path.join(root,'data',slug,'1d.json');
    const row={ticker,status:'checking',referenceDate:index.entries.find(e=>e.ticker===ticker&&e.timeframe==='1d')?.lastBarDate??null,missing_files_before:tfs.filter(tf=>!fs.existsSync(path.join(root,'data',slug,`${tf}.json`)))};
    try {
      const before=fs.existsSync(file)?read(file):null;
      row.referenceDate=before?.lastBarDate??row.referenceDate;
      const result=await pipeline({ticker,timeframe:'1d',force:true,fullHistory:true});
      const quote=result.quote;
      if(!quote?.ohlcv?.length)throw new Error('Missing verified daily result');
      const remaining=tfs.filter(tf=>!fs.existsSync(path.join(root,'data',slug,`${tf}.json`)));
      if(remaining.length)throw new Error('Missing regenerated files: '+remaining.join(', '));
      Object.assign(row,{status:'verified',before_count:before?.barCount??0,after_count:quote.barCount,lastBarDate:quote.lastBarDate,...historyChanges(before,quote),source_tags:quote.source_tags??[],integrity_verification:quote.integrity_verification??null});
      report.totals.checked++;report.totals.restoredFiles+=row.missing_files_before.length;
      report.totals.historicalAdded+=row.historical_added_dates.length;report.totals.newBars+=row.new_dates.length;report.totals.revisedBars+=row.revised_dates.length;
      report.source_tags.push(...row.source_tags);
    } catch(error){row.status='failed';row.reason=safeReason(error);row.failedAt=new Date().toISOString();report.totals.failed++;}
    report.series.push(row);
    console.log(JSON.stringify({ticker,status:row.status,historicalAdded:row.historical_added_dates?.length,revised:row.revised_dates?.length,reason:row.reason}));
  }
  report.source_tags=[...new Set(report.source_tags)];
  report.complete=report.totals.scanned>0&&report.totals.failed===0;
  report.finishedAt=new Date().toISOString();
  return report;
}
export function buildMarkdown(report){
  const esc=v=>String(v??'').replaceAll('|','\\|');
  return ['# 전체 보관 이력 배치 검사','',`- 확인 시각(UTC): ${report.ranAt}`,`- 검사 ${report.totals.scanned}종목 / 통과 ${report.totals.checked} / 실패 ${report.totals.failed} / 격리 제외 ${report.totals.excluded}`,`- 과거 날짜 보충 ${report.totals.historicalAdded} / 신규 봉 ${report.totals.newBars} / 기존 봉 변경 ${report.totals.revisedBars} / 파일 복구 ${report.totals.restoredFiles}`,`- 출처: ${report.source_tags.map(t=>`[${t}]`).join(' ')}`,'',report.complete?'전체 검사 통과 후 최종 데이터 검증·커밋을 진행합니다.':'실패한 종목이 있어 이 배치의 데이터는 커밋하지 않습니다. 기존 원격 데이터를 유지합니다.','','| 종목 | 상태 | 과거 날짜 보충 | 신규 봉 | 변경 봉 | 복구 파일 | 사유 |','| --- | --- | ---: | ---: | ---: | --- | --- |',...report.series.map(r=>`| ${esc(r.ticker)} | ${r.status} | ${r.historical_added_dates?.length??0} | ${r.new_dates?.length??0} | ${r.revised_dates?.length??0} | ${esc(r.missing_files_before?.join(', '))} | ${esc(r.reason)} |`),'','과거 날짜 보충에는 보관 기간의 앞부분 확장도 포함합니다. 휴장일을 평일 달력으로 추정해 채우지 않습니다. 날짜별 결과는 JSON 보고서를 확인하세요.',''].join('\n');
}
async function main(){
  const report=await runScheduledStaleRefresh(),out=path.join(ROOT,'artifacts');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'fetch-run-report.json'),JSON.stringify(report,null,2)+'\n');
  const md=buildMarkdown(report);fs.writeFileSync(path.join(out,'fetch-run-report.md'),md);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  console.log(JSON.stringify(report.totals));
  if(!report.complete)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Full-history batch failed before completion; no data commit permitted');process.exitCode=1;});
