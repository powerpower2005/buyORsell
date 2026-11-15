# 수집 v2.0.0 · SOXX 데이터 복구 v1.0.0

2026-11-16. 수집·복구 버전은 [설정](../config/collection-versions.json)에 기록합니다. 지표 수식·시그널 조건·성과 계산 엔진은 바꾸지 않았으므로 기존 분석 항목별 버전은 유지합니다.

## 발견한 원인

SOXX 일봉의 잘못된 15개 행은 삼성전기 `009150:KRX`의 같은 날짜 **시가·고가·저가·종가·거래량 전체**와 일치합니다. 예를 들어 2026-06-19 SOXX로 저장된 종가 2,270,000과 거래량 1,728,303은 삼성전기 행과 동일합니다. 해당 날짜들은 미국 증시 휴장일입니다. 단순 소수점 오류나 SOXX의 실제 급등이 아닙니다.

기존 `fetchBarsGoogleFinance`는 모든 종목·백필 요청에 `BarsFetch-v1!Z1`을 재사용했습니다. 요청 A가 수식을 넣고 기다리는 동안 요청 B가 덮어쓰면 A도 B의 OHLCV를 읽을 수 있습니다. 파서는 숫자 행이 있으면 성공으로 처리했고, 요청 종목·날짜 범위나 계산 소유권을 검증하지 않았습니다. 워크플로 동시성 그룹도 종목·이슈별로 달라 같은 계산 셀을 보호하지 못했습니다. 같은 스프레드시트를 쓰는 다른 저장소와도 충돌할 수 있습니다.

정상 SOXX 데이터를 이후에 받아도 `mergeOhlcv`는 날짜를 추가·덮어쓰기만 합니다. 미국 휴장일은 정상 응답에 없으므로 그 날짜에 잘못 들어간 한국 종목 행이 계속 남습니다. 이 두 단계의 결합을 회귀 테스트로 재현했습니다. 오염 출처와 현재 코드의 실패 경로는 확인했지만, 최초 오염 당시 개별 요청의 실행 순서까지 남아 있는 것은 아닙니다.

전 종목 간 동일 OHLCV 비교에서는 이미 추적 제외 중인 `CRD:NTYSE`에서도 `000660:KRX`와 일치하는 이력이 발견됐습니다. CRD는 종목 코드 자체 확인이 필요하므로 이번 SOXX 복구에 섞어 수정하거나 추적 대상으로 복귀시키지 않습니다.

## 수정 전후

| 항목 | 이전 | v2.0.0 |
| --- | --- | --- |
| 계산 공간 | 공유 시트의 동일 셀 | 요청마다 UUID 이름의 새 임시 시트 |
| 수식 기록 | 기존 셀 덮어쓰기 후 대기 | 시트 생성과 수식 기록을 원자적 배치로 수행 |
| 읽기 범위 | 고정 700행 | 요청 날짜 구간의 최대 일수 + 헤더에 맞춰 확보 |
| 입력 검사 | 파싱 가능한 행만 채택 | 부분 오류, 중복/역순/범위 밖 날짜, 무한값, OHLC 모순 거부 |
| 출처 | Sheets로 수집해도 `gf` | `google_sheets_googfinance`, 실제 출처 태그, 수집 버전 |
| 정리 | 공유 공간 유지 | 성공·실패 후 자신이 생성 확인한 시트만 삭제 |

GOOGLEFINANCE 계산이 아직 준비되지 않았으면 설정된 횟수만큼 재조회합니다. 전체 실패 시 기존 데이터를 다른 종목의 결과로 대체하지 않습니다. 생성 응답이 유실되거나 프로세스가 강제 종료되면 임시 탭이 남을 수 있습니다. 그런 경우 `BarsFetch-v2-` 접두어 탭을 운영자가 확인하며, 다른 요청의 시트를 자동 삭제하지 않습니다. 기존 `BarsFetch-v1`과 이름 조회용 시트도 삭제하지 않습니다.

Sheets 원자적 배치 동작은 [Google 공식 문서](https://developers.google.com/workspace/sheets/api/guides/batch)를 따릅니다. 요청 격리와 값 검사는 데이터 제공자 자체의 모든 오류를 보장하는 장치가 아닙니다.

## 기존 데이터 복구

원본 커밋 `8e19ef6f682218312637b911259f0a0aa30f2966`에서 다음 조건을 동시에 만족하는 15개 일봉만 제거했습니다.

1. 삼성전기 행과 날짜·OHLCV 모두 정확히 일치.
2. 확인된 미국 휴장일 목록에 포함.
3. 사전에 검토한 15개 날짜 집합과 정확히 일치. 증거가 달라지면 복구 스크립트가 중단.

일봉은 999 → **984개**이며 나머지 가격·거래량은 바꾸지 않았습니다. 임의 가격으로 대체하거나 빈 휴장일 봉을 만들지 않았습니다. 복구한 일봉에서 주봉 200개와 월봉 48개를 다시 만들었고, 각각 **15개 주봉·14개 월봉**의 값이 정정됐습니다. `fetchedAt`은 기존 실제 수집 시각을 유지하고 별도 `data_recovery.repaired_at`을 기록합니다. 원본·결과 해시, 제거한 행, 대조 종목·휴장일 출처는 [감사 기록](../data-repairs/2026-11-16.json)에 있습니다.

휴장일 근거: [NYSE 2024–2026 일정](https://ir.theice.com/press/news-details/2023/NYSE-Group-Announces-2024-2025-and-2026-Holiday-and-Early-Closings-Calendar/default.aspx), [Nasdaq 일정](https://www.nasdaqtrader.com/Trader.aspx?id=Calendar), [2025-01-09 특별 휴장 공지](https://www.nasdaq.com/press-release/nasdaq-announces-closure-its-us-markets-honor-national-day-mourning-former-president).

## 검증·운영

```powershell
npm run test:collection
npm run test:stale-refresh
npm run validate-data
# 이미 적용된 동일 복구는 아무것도 변경하지 않음
node scripts/repair-soxx-history.mjs
```

CI `Collection integrity`는 요청 경쟁 재현·격리·실패 정리·범위/가격 검사·근거가 바뀐 복구 차단·실제 SOXX 집계 일치를 검사합니다.

Actions **Fetch Quote**의 `verify_soxx_recovery=true`, ticker=`SOXX:NASDAQ`는 기존 기간 전체를 `NASDAQ:SOXX`로 새 격리 요청하여 복구 결과와 대조합니다. `data/`나 GitHub 브랜치는 변경하지 않으며, 출처·기간·개수·해시·차이 날짜만 담은 검증 보고서와 공급자 quote를 artifact로 남깁니다. 불일치 시 실패하며 추적 복귀 전에 검토해야 합니다. 자격증명은 기존 Actions Secrets를 사용합니다.

일반 병합을 무조건 전체 교체로 바꾸지는 않았습니다. 제공자가 일부 자료만 반환하는 상황에서 정상 과거 이력을 삭제할 수 있기 때문입니다. 복구는 증거를 가진 별도 절차로 수행합니다.
