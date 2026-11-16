#!/usr/bin/env node
/** Operational batch notifications only. No chart-signal or sector channel fallback. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const VERSION = '1.0.0';
const stages = [
  ['checkout', '소스 준비'], ['setup', '실행 환경 준비'], ['install', '의존성 설치'],
  ['parse', '배치 요청 확인'], ['audit', '전체 이력 수집·누락 검사'],
  ['report', '검사 보고서 보관'], ['validate', '최종 데이터 검증'], ['commit', 'GitHub 저장'],
];
const sourceTags = new Set([
  'GoogleFinance:GOOGLEFINANCE', 'GoogleSheets:sheets.googleapis.com',
  'Validation:query1.finance.yahoo.com', 'Validation:fchart.stock.naver.com',
  'YahooFinance:query1.finance.yahoo.com', 'NaverFinance:fchart.stock.naver.com',
]);
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : '확인 불가';
const ticker = value => /^[A-Z0-9.]{1,20}:[A-Z]{2,12}$/.test(value ?? '') ? value : '종목 확인 불가';
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
function kst(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms + 9 * 3600000).toISOString().slice(0, 19).replace('T', ' ') + ' KST' : '확인 불가';
}
function reason(value) {
  if (/^Independent /.test(value ?? '')) return '독립 출처의 가격·날짜 검증 실패';
  if (/^(Cross-symbol |Resolved |Quarantined |Unsupported )/.test(value ?? '')) return '종목 식별·격리 정책 검사 실패';
  if (/^(Reviewed |Unreviewed )/.test(value ?? '')) return '검토된 가격 보정 근거 또는 급변 검사 불일치';
  if (/^(Missing |Full-history |No bars|GOOGLEFINANCE returned)/.test(value ?? '')) return '필수 데이터·기간·파일 부족';
  if (/^(Invalid |Quote )/.test(value ?? '')) return '데이터 형식·가격 유효성 검사 실패';
  return '수집 또는 검증을 완료하지 못함';
}
function links(context) {
  const repo = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(context.repository ?? '') ? context.repository : null;
  const run = /^\d+$/.test(context.runId ?? '') ? context.runId : null;
  const attempt = /^\d+$/.test(context.attempt ?? '') ? context.attempt : '1';
  const lines = [repo && run ? `실행: https://github.com/${repo}/actions/runs/${run}/attempts/${attempt}` : '실행 링크: 확인 불가'];
  if (repo && /^[a-f0-9]{40}$/.test(context.commit ?? '')) lines.push(`저장 커밋: https://github.com/${repo}/commit/${context.commit}`);
  return lines;
}

export function buildNotification({report, context, detectedAt = new Date().toISOString(), deliveryFailure = false}) {
  const rows = Array.isArray(report?.series) ? report.series.filter(r => r && typeof r === 'object' && !Array.isArray(r)) : [];
  const totals = report?.totals ?? {};
  const complete = report?.mode === 'full-history-batch' && report.complete === true &&
    Number.isSafeInteger(totals.scanned) && totals.scanned > 0 && totals.checked === totals.scanned &&
    totals.failed === 0 && rows.filter(r => r.status === 'verified').length === totals.checked &&
    rows.length === report.series.length &&
    rows.every(r => ['verified', 'excluded'].includes(r.status));
  const succeeded = !deliveryFailure && context.result === 'success' && complete &&
    stages.every(([id]) => context.outcomes?.[id] === 'success') && context.download === 'success';
  const failedStage = stages.find(([id]) => context.outcomes?.[id] === 'failure' || context.outcomes?.[id] === 'cancelled') ??
    stages.find(([id]) => context.outcomes?.[id] !== 'success');
  const stage = deliveryFailure ? 'Slack 성공 로그 전송' : failedStage?.[1] ??
    (context.download !== 'success' || !complete ? '검사 보고서 확인' : '배치 실행 결과 확인');
  const dates = [...new Set(rows.map(r => date(r.lastBarDate ?? r.referenceDate)).filter(d => d !== '확인 불가'))].sort();
  const reference = dates.length ? (dates.length === 1 ? dates[0] : `${dates[0]} ~ ${dates.at(-1)} (종목별 상이)`) : '확인 불가';
  const tags = [...new Set((Array.isArray(report?.source_tags) ? report.source_tags : []).filter(t => sourceTags.has(t)))];
  const lines = [
    succeeded ? '[종목 데이터 배치] 검사·저장 완료' : '[종목 데이터 배치] 오류',
    `${succeeded ? '완료 확인' : '감지'} 시각: ${kst(detectedAt)}`,
    `기준일(거래일): ${reference}`,
  ];
  if (!succeeded) {
    lines.push(`실패 단계: ${stage}`,
      `원인: ${deliveryFailure ? '성공 로그의 Slack 전송 확인을 받지 못함 (재전송하지 않음)' :
        stage === 'GitHub 저장' ? '커밋·푸시 완료를 확인하지 못함' :
        stage === '검사 보고서 확인' ? '보고서 누락·불완전 또는 다운로드 실패' :
        '해당 단계가 정상 완료되지 않음; 실행 기록 확인 필요'}`);
  }
  if (report) lines.push(`검사 ${count(totals.scanned)} / 통과 ${count(totals.checked)} / 실패 ${count(totals.failed)} / 격리 제외 ${count(totals.excluded)}`,
    `과거 날짜 보충 ${count(totals.historicalAdded)} / 신규 봉 ${count(totals.newBars)} / 기존 봉 변경 ${count(totals.revisedBars)} / 파일 복구 ${count(totals.restoredFiles)}`,
    '과거 날짜 보충에는 보관 기간 앞부분 확장도 포함합니다.');
  if (!succeeded && report && context.outcomes?.commit !== 'success') {
    lines.push(context.outcomes?.commit === 'skipped' ? '이 배치 데이터의 저장 단계는 실행하지 않았습니다.' : '원격 저장 상태는 실행 기록에서 확인해야 합니다.');
  }
  const details = succeeded ? rows.filter(r => r.status === 'verified' &&
    [r.historical_added_dates, r.new_dates, r.revised_dates, r.missing_files_before].some(a => Array.isArray(a) && a.length)) : rows.filter(r => r.status === 'failed');
  for (const r of details.slice(0, 12)) {
    lines.push(succeeded ? `• ${ticker(r.ticker)} (${date(r.lastBarDate)}): 과거 +${count(r.historical_added_dates?.length)}, 신규 +${count(r.new_dates?.length)}, 변경 ${count(r.revised_dates?.length)}, 파일 복구 ${count(r.missing_files_before?.length)}` :
      `• ${ticker(r.ticker)} (${date(r.referenceDate)}): ${reason(r.reason)} / 감지 ${kst(r.failedAt)}`);
  }
  if (details.length > 12) lines.push(`외 ${details.length - 12}종목: 실행 보고서 참조`);
  lines.push(...links(context), `출처: ${tags.length ? tags.map(t => `[${t}]`).join(' ') : '[GitHub:Actions] (시장 데이터 출처 확인 전)'}`, `배치 알림 v${VERSION}`);
  return {kind: succeeded ? 'success' : 'error', text: lines.join('\n')};
}

async function post({token, channel, text, fetchImpl}) {
  // No retry after a timeout: Slack may already have accepted the message.
  try {
    const response = await fetchImpl('https://slack.com/api/chat.postMessage', {
      method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8'},
      body: JSON.stringify({channel, text, mrkdwn: false, unfurl_links: false, unfurl_media: false}),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok || body?.ok !== true || body.channel !== channel || !/^\d+\.\d+$/.test(body.ts ?? '')) throw new Error();
    return {channel: body.channel, ts: body.ts};
  } catch { throw new Error('Slack delivery acknowledgement unavailable'); }
}

export async function notifyBatch({report, context, env = process.env, fetchImpl = fetch, detectedAt = new Date().toISOString()}) {
  const token = env.SLACK_BOT_TOKEN;
  const log = env.SLACK_LOG_CHANNEL_ID;
  const error = env.SLACK_ERROR_CHANNEL_ID;
  if (!token || !/^[CG][A-Z0-9]+$/.test(error ?? '')) throw new Error('Slack bot token or error channel is not configured');
  if (!/^[CG][A-Z0-9]+$/.test(log ?? '') || log === error) {
    // A valid error channel can still explain a missing log-channel configuration.
    const fallback = buildNotification({report, context, detectedAt, deliveryFailure: true});
    await post({token, channel: error, text: fallback.text.replace('성공 로그의 Slack 전송 확인을 받지 못함 (재전송하지 않음)', '로그 채널 설정 누락·오류 또는 로그/오류 채널 중복'), fetchImpl});
    throw new Error('Slack operational channels must be configured separately');
  }
  const message = buildNotification({report, context, detectedAt});
  try {
    const receipt = await post({token, channel: message.kind === 'success' ? log : error, text: message.text, fetchImpl});
    return {version: VERSION, kind: message.kind, ...receipt};
  } catch {
    if (message.kind === 'success') {
      const fallback = buildNotification({report, context, detectedAt: new Date().toISOString(), deliveryFailure: true});
      await post({token, channel: error, text: fallback.text, fetchImpl});
    }
    throw new Error('Batch notification was not acknowledged; automatic resend disabled');
  }
}

async function main() {
  let report;
  try { report = JSON.parse(fs.readFileSync('artifacts/fetch-run-report.json', 'utf8')); } catch {}
  const env = process.env;
  const context = {result: env.BATCH_RESULT, download: env.REPORT_DOWNLOAD, repository: env.GITHUB_REPOSITORY,
    runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, commit: env.DATA_COMMIT,
    outcomes: Object.fromEntries(stages.map(([id]) => [id, env[`BATCH_${id.toUpperCase()}`]]))};
  const receipt = await notifyBatch({report, context});
  fs.mkdirSync('artifacts', {recursive: true});
  fs.writeFileSync('artifacts/batch-notification-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log(`Batch ${receipt.kind} notification acknowledged (v${VERSION})`);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `\n배치 ${receipt.kind === 'success' ? '로그' : '오류'} 채널 전송 확인 — 알림 v${VERSION}\n`);
  // A malformed/missing report must not turn a successful fetch job into a green notification job.
  if (receipt.kind === 'error' && context.result === 'success') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  // All outward exceptions are our fixed messages, never provider/Slack payloads or credentials.
  console.error(error.message.startsWith('Slack ') || error.message.startsWith('Batch notification') ? error.message : 'Batch notification failed');
  process.exitCode = 1;
});
