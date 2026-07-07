# Google Finance Evaluator

Google Sheets `GOOGLEFINANCE` 함수로 **실제 일봉 OHLCV**를 수집하고, **브라우저에서** 기술적 분석·종합 점수·백테스트를 수행하는 100% 정적 웹 앱입니다.

데이터 파이프라인은 [Hedge](https://github.com/powerpower2005/Hedge)의 `BarsFetch-v1` + `GOOGLEFINANCE(...,"all")` 방식을 참고해 Node.js로 이식했습니다.

> **면책:** 교육·참고용이며 투자 권유가 아닙니다.

## 아키텍처

| 영역 | 방식 |
|------|------|
| 데이터 수집 | GitHub Actions → Google Sheets `GOOGLEFINANCE` → `data/{TICKER-SLUG}/{tf}.json` commit |
| 데이터 읽기 | `raw.githubusercontent.com` + 로컬 `/data/` (dev) |
| 트리거 | GitHub Issue Form + mega-issue `/fetch NVDA:NASDAQ 1d` comment |
| 평가 | 브라우저 TypeScript + `technicalindicators` + plugin registry |

## Google Sheets 설정 (필수)

1. Google Cloud에서 **Service Account** 생성 → JSON 키 다운로드
2. 스프레드시트 생성 후 Service Account `client_email`에 **편집자** 권한 부여
3. 스프레드시트 URL의 ID를 `GOOGLE_SHEET_ID`에 설정
4. JSON을 `config/service_account.json`에 저장 (또는 `GOOGLE_SERVICE_ACCOUNT_JSON` env)

```bash
cp config/service_account.json.example config/service_account.json
# 편집 후 .env에 GOOGLE_SHEET_ID 입력
cp .env.example .env
```

Fetch 시 `BarsFetch-v1` 탭의 `Z1`에 다음 형태의 수식이 들어갑니다:

```excel
=GOOGLEFINANCE("NASDAQ:NVDA","all",DATE(2025,7,7),DATE(2026,7,7))
```

결과 테이블(date, open, high, low, close, volume)을 파싱해 JSON으로 commit합니다.

거래소 접두가 틀린 경우 Hedge와 같이 후보를 순서대로 시도합니다 (예: `NASDAQ:NVDA` → `NYSE:NVDA` …).

## 로컬 개발

```bash
npm install
cp .env.example .env
# GOOGLE_SHEET_ID + service account 설정 후:
npm run test:fetch
npm run dev
```

레거시 batchexecute(합성 OHLC)가 필요하면:

```bash
FETCH_SOURCE=batchexecute npm run fetch:batchexecute NVDA:NASDAQ 1d
```

## GitHub Actions Secrets

| Secret | 설명 |
|--------|------|
| `GOOGLE_SHEET_ID` | 스프레드시트 ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service Account JSON 전체 (한 줄) |

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run fetch` | Sheets GOOGLEFINANCE fetch (기본) |
| `npm run fetch:batchexecute` | 레거시 RPC scrape |
| `npm run test:fetch` | NVDA:NASDAQ 1d fetch + merge |
| `npm run validate-data` | JSON Schema 검증 |

## 환경 변수

| 변수 | 설명 |
|------|------|
| `FETCH_SOURCE` | `sheets` (default) 또는 `batchexecute` |
| `GOOGLE_SHEET_ID` | 스프레드시트 ID |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | JSON 경로 (default: `config/service_account.json`) |
| `SHEETS_FORMULA_SEP` | 한국어 Sheets locale이면 `;` |
| `VITE_GITHUB_REPO` | raw URL / Issue (필수) |
| `VITE_GITHUB_BRANCH` | raw branch (필수) |

## 프로젝트 구조

```
config/          # indicators, scoring, sheets.json, service account
scripts/
  fetch-quote.mjs       # unified fetch (Sheets default)
  lib/sheets-bars.mjs   # GOOGLEFINANCE "all" (Hedge port)
data/            # committed OHLCV JSON
src/             # Vite React SPA
```

## 라이선스

MIT
