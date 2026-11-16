import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNotification, notifyBatch} from '../notify-batch-result.mjs';

const env = {SLACK_BOT_TOKEN: 'test-token', SLACK_LOG_CHANNEL_ID: 'CLOG123', SLACK_ERROR_CHANNEL_ID: 'CERROR123', SLACK_CHART_SIGNAL_CHANNEL_ID: 'CSIGNAL123', SLACK_SECTOR_CHANNEL_ID: 'CSECTOR123'};
const context = () => ({result: 'success', download: 'success', repository: 'powerpower2005/buyORsell', runId: '123', attempt: '2', commit: 'a'.repeat(40),
  outcomes: Object.fromEntries(['checkout','setup','install','parse','audit','report','validate','commit'].map(k => [k, 'success']))});
const report = () => ({mode: 'full-history-batch', complete: true, totals: {scanned: 1, checked: 1, failed: 0, historicalAdded: 2, newBars: 1, revisedBars: 0, restoredFiles: 1},
  source_tags: ['GoogleFinance:GOOGLEFINANCE','Validation:query1.finance.yahoo.com'], series: [{ticker:'AAPL:NASDAQ', status:'verified', lastBarDate:'2026-11-13', historical_added_dates:['2022-11-01','2022-11-02'], new_dates:['2026-11-13'], revised_dates:[], missing_files_before:['1w']}]});
const detectedAt = '2026-11-16T15:12:34Z';
function transport(responses = []) {
  const calls = [];
  return {calls, fetchImpl: async (url, options) => {
    const body = JSON.parse(options.body); calls.push({url, options, body});
    const response = responses.shift(); if (response instanceof Error) throw response;
    return response ?? {ok:true,json:async () => ({ok:true,channel:body.channel,ts:'123456.789'})};
  }};
}
test('verified and published batch goes only to log channel with date, counts, KST, source and run link', async () => {
  const mock = transport(); const receipt = await notifyBatch({report:report(),context:context(),env,detectedAt,...mock});
  assert.equal(receipt.kind,'success'); assert.equal(mock.calls.length,1);
  const call=mock.calls[0]; assert.equal(call.body.channel,env.SLACK_LOG_CHANNEL_ID);
  assert.match(call.body.text,/2026-11-17 00:12:34 KST/); assert.match(call.body.text,/2026-11-13/);
  assert.match(call.body.text,/과거 날짜 보충 2/); assert.match(call.body.text,/파일 복구 1/);
  assert.match(call.body.text,/앞부분 확장/); assert.match(call.body.text,/actions\/runs\/123\/attempts\/2/);
  assert.match(call.body.text,/\[GoogleFinance:GOOGLEFINANCE\]/); assert.match(call.body.text,/commit\/a{40}/);
  assert.equal(call.body.mrkdwn,false); assert.equal(call.body.unfurl_links,false);
});
test('every failed batch stage goes to error, including setup with no report and push with uncertain remote state', async () => {
  for (const stage of Object.keys(context().outcomes)) {
    const c=context(); c.result='failure'; c.outcomes[stage]='failure';
    for (const later of Object.keys(c.outcomes).slice(Object.keys(c.outcomes).indexOf(stage)+1)) c.outcomes[later]='skipped';
    const mock=transport(); const r=await notifyBatch({report: stage==='checkout'?undefined:report(),context:c,env,detectedAt,...mock});
    assert.equal(r.kind,'error'); assert.equal(mock.calls[0].body.channel,env.SLACK_ERROR_CHANNEL_ID);
    assert.match(mock.calls[0].body.text,/실패 단계:/);
    if(stage==='commit') assert.match(mock.calls[0].body.text,/커밋·푸시 완료를 확인하지 못함/);
    if(stage==='checkout') assert.match(mock.calls[0].body.text,/기준일\(거래일\): 확인 불가/);
  }
});
test('incomplete, missing, inconsistent reports and report downloads never produce a success log', () => {
  const incomplete=report(); incomplete.complete=false;
  const inconsistent=report(); inconsistent.totals.checked=0;
  const wrongRows=report(); wrongRows.series[0].status='failed';
  const malformed=report();malformed.series.push(null);
  for(const r of [undefined,{},incomplete,inconsistent,wrongRows,malformed]) assert.equal(buildNotification({report:r,context:context(),detectedAt}).kind,'error');
  const c=context(); c.download='failure'; assert.equal(buildNotification({report:report(),context:c}).kind,'error');
  c.download='success'; c.result='cancelled'; assert.equal(buildNotification({report:report(),context:c}).kind,'error');
});
test('error details use recorded detection time and reference date without leaking raw errors or source strings', async () => {
  const r=report(); r.complete=false;r.totals.failed=1;r.totals.checked=0;
  r.series=[{ticker:'AAPL:NASDAQ',status:'failed',referenceDate:'2026-11-12',failedAt:'2026-11-16T01:02:03Z',reason:'Independent price mismatch SECRET_TOKEN <@here>'}];
  r.source_tags.push('SECRET_TOKEN');
  const c=context(); c.result='failure'; c.outcomes.audit='failure'; c.outcomes.commit='skipped';
  const message=buildNotification({report:r,context:c,detectedAt});
  assert.match(message.text,/독립 출처의 가격·날짜 검증 실패/);assert.match(message.text,/2026-11-16 10:02:03 KST/);
  assert.match(message.text,/2026-11-12/);assert.doesNotMatch(message.text,/SECRET_TOKEN|@here/);
  assert.match(message.text,/저장 단계는 실행하지 않았습니다/);
});
test('ambiguous success-log POST is not retried; error channel receives one separate delivery failure', async () => {
  const mock=transport([new Error('timeout with SECRET_TOKEN')]);
  await assert.rejects(notifyBatch({report:report(),context:context(),env,detectedAt,...mock}),/automatic resend disabled/);
  assert.deepEqual(mock.calls.map(c=>c.body.channel),[env.SLACK_LOG_CHANNEL_ID,env.SLACK_ERROR_CHANNEL_ID]);
  assert.match(mock.calls[1].body.text,/Slack 성공 로그 전송/);assert.doesNotMatch(mock.calls[1].body.text,/SECRET_TOKEN/);
});
test('Slack false OK, wrong channel, missing receipt and HTTP errors fail acknowledgement; errors never recurse', async () => {
  for(const response of [
    {ok:true,json:async()=>({ok:false,error:'SECRET_TOKEN'})},
    {ok:true,json:async()=>({ok:true,channel:'CWRONG',ts:'1.2'})},
    {ok:true,json:async()=>({ok:true,channel:env.SLACK_ERROR_CHANNEL_ID})},
    {ok:false,json:async()=>({ok:true,channel:env.SLACK_ERROR_CHANNEL_ID,ts:'1.2'})},
    new Error('SECRET_TOKEN'),
  ]) {
    const c=context();c.result='failure';c.outcomes.audit='failure';
    const mock=transport([response]);
    await assert.rejects(notifyBatch({context:c,env,...mock}),/automatic resend disabled/);
    assert.equal(mock.calls.length,1);assert.equal(mock.calls[0].body.channel,env.SLACK_ERROR_CHANNEL_ID);
  }
});
test('missing configuration never falls back to chart or sector; log/error channels must differ', async () => {
  const absent=transport();
  await assert.rejects(notifyBatch({context:context(),env:{SLACK_CHART_SIGNAL_CHANNEL_ID:'CSIGNAL'},...absent}),/not configured/);
  assert.equal(absent.calls.length,0);
  for(const log of ['',env.SLACK_ERROR_CHANNEL_ID]) {
    const mock=transport();await assert.rejects(notifyBatch({context:context(),env:{...env,SLACK_LOG_CHANNEL_ID:log},...mock}),/configured separately/);
    assert.deepEqual(mock.calls.map(c=>c.body.channel),[env.SLACK_ERROR_CHANNEL_ID]);
    assert.match(mock.calls[0].body.text,/로그 채널 설정 누락/);
  }
});
test('large error batches are bounded and link to the full report', () => {
  const r=report();r.complete=false;r.series=Array.from({length:500},()=>({ticker:'AAPL:NASDAQ',status:'failed',reason:'x'.repeat(50000)}));
  const message=buildNotification({report:r,context:context()});
  assert.ok(message.text.length<4000);assert.match(message.text,/외 488종목/);
});
test('workflow sends only scheduled or explicitly requested full batches after fetch and passes no investment channels', () => {
  const workflow=fs.readFileSync(new URL('../../.github/workflows/fetch-quote.yml',import.meta.url),'utf8');
  const notify=workflow.split('\n  notify-batch:')[1];
  assert.match(notify,/needs: fetch/);assert.match(notify,/if: always\(\) && \(github.event_name == 'schedule' \|\| inputs.batch_refresh\)/);
  assert.match(notify,/BATCH_COMMIT: \$\{\{ needs.fetch.outputs.commit \}\}/);
  assert.match(notify,/ref: \$\{\{ github.sha \}\}/);
  assert.doesNotMatch(notify,/SLACK_CHART_SIGNAL_CHANNEL_ID|SLACK_SECTOR_CHANNEL_ID/);
  assert.ok(workflow.indexOf('name: Validate complete data')<workflow.indexOf('name: Commit data'));
});
