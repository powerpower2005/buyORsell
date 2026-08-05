import type { HelpContent } from "./indicatorHelp";
import type { MacdStrategyId } from "./macdStrategyMeta";
import { MACD_STRATEGY_META } from "./macdStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const MACD_STRATEGY_HELP: Record<MacdStrategyId, HelpContent> = {
  macd_signal_cross: {
    title: "시그널 선 크로스",
    summary: MACD_STRATEGY_META.macd_signal_cross.description,
    howToFind:
      "파란 MACD 선이 노란 시그널을 아래에서 위로 뚫으면 골든(롱), 위에서 아래로 뚫으면 데드(숏). 엔트리는 교차만 봅니다. 0선 위 골든·0선 아래 데드면 요약에 ‘0선 확인’이 붙습니다(정보일 뿐 필터 아님).",
    ...BREAK,
    higher: "골든 크로스 → 롱 후보.",
    lower: "데드 크로스 → 숏 후보.",
    worksWith:
      "같이 켤 지표: SMA200(위=롱만·아래=숏만), 지지·저항(교차가 존 근처인지), ADX(횡보 휩쏘), 거래량. 교재식 추세추종은 SMA200·S/R과 같이 보세요.",
    pros:
      "필터를 최소로 둬 신호를 놓치지 않습니다. Hist·0선·SMA200은 companion으로 신뢰도를 올립니다.",
    cons:
      "후행·횡보 휩쏘가 큽니다. 골든/데드가 이미 추세 중반인 경우가 많습니다.",
    tip: "스쿨이 갈립니다 — 앱은 0선 위 골든을 신뢰↑로 표기. 일부 교재는 0선 아래 골든만 롱. SMA200·ADX로 고르세요.",
  },
  macd_zero_line: {
    title: "기준선(0선) 매매",
    summary: MACD_STRATEGY_META.macd_zero_line.description,
    howToFind:
      "MACD가 0을 상향/하향 돌파하는 봉, 또는 돌파 뒤 시그널 근처로 되돌아온 눌림·반등 봉을 찾습니다. 엔트리 롱=0선 상향(또는 그 후 눌림 재상승).",
    ...BREAK,
    higher: "0선 상향 또는 상승 구간 시그널 눌림 재상승 → 롱.",
    lower: "0선 하향 또는 하락 구간 시그널 반등 재하락 → 숏.",
    worksWith:
      "SMA200·S/R·ADX·거래량. 상승장(가격>SMA200)에서 0선 하향은 ‘눌림’ 참고일 뿐 — 이 전략 롱 히트는 아님.",
    pros:
      "추세 필터(0선)와 눌림 재진입을 한 지표에서 봅니다.",
    cons:
      "0선 돌파도 후행·횡보 휩쏘가 있습니다. SMA200 없이 쓰면 역추세 신호가 많습니다.",
    tip: "교재의 «SMA200 위 + 0선 하향 매수»는 companion 플레이입니다. 마커는 상향/하향 돌파와 시그널 재진입만 찍습니다.",
  },
  macd_rsi_confirm: {
    title: "과매수·과매도 확인 (MACD+RSI)",
    summary: MACD_STRATEGY_META.macd_rsi_confirm.description,
    howToFind:
      "RSI가 30 이하→탈출 후 MACD 골든이면 롱. RSI가 80 이상→이탈 후 MACD 데드이면 숏.",
    ...BREAK,
    higher: "과매도 탈출 + MACD 골든 → 롱.",
    lower: "과매수 이탈 + MACD 데드 → 숏.",
    worksWith:
      "SMA200(추세 필터), 지지·저항, 거래량. 이미 RSI+MACD를 묶은 전략이라 위치·대세만 더하면 됩니다.",
    tip: "강한 상승에서 RSI 과매수 숏은 이르기 쉽습니다 — SMA200 위를 companion으로 확인하세요.",
  },
  macd_divergence: {
    title: "MACD 다이버전스",
    summary: MACD_STRATEGY_META.macd_divergence.description,
    howToFind:
      "가격 스윙과 MACD 스윙이 어긋난 뒤, MACD·시그널 골든/데드가 나는 봉에 마커가 찍힙니다.",
    ...BREAK,
    higher: "상승 다이버전스 + 골든 → 롱.",
    lower: "하락 다이버전스 + 데드 → 숏.",
    worksWith:
      "RSI 다이버전스(이중 확인), 지지·저항, 거래량, SMA200(대세와 어긋나면 보수적).",
    tip: "단독 다이버전스보다 시그널 크로스 확인이 붙은 신호가 더 안정적입니다.",
  },
  macd_trend_break: {
    title: "MACD 돌파 매매",
    summary: MACD_STRATEGY_META.macd_trend_break.description,
    howToFind:
      "가격의 최근 하락(상승) 고점·저점 구조를 깨는 동시에 MACD·시그널이 같은 방향으로 돌파·정렬되는 봉을 찾습니다. 코드는 동시 돌파입니다.",
    ...BREAK,
    higher: "하락 구조 상향 돌파 + MACD·시그널 상승 정렬 → 롱.",
    lower: "상승 구조 하향 돌파 + MACD·시그널 하락 정렬 → 숏.",
    worksWith:
      "거래량·S/R·ADX·SMA200. 교재는 MACD 추세선이 먼저 무너진 뒤 가격 추세선 — 차트에서 선후를 companion 감각으로 확인하세요.",
    tip: "가격만 돌파하고 MACD가 따라오지 않으면 가짜 돌파일 수 있습니다. 손익비 2:1·변곡점 손절은 참고(미연결).",
  },
};

export function macdStrategyHelp(id: MacdStrategyId): HelpContent {
  return MACD_STRATEGY_HELP[id];
}
