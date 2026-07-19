/** Help copy for ChartSidebar layer toggles (? popups). Uses shared HelpContent. */

import type { AuxIndicatorId } from "./auxIndicatorStore";
import {
  CANDLE_PATTERN_META,
  type CandlePatternMeta,
} from "./candlePatternMeta";
import {
  CHART_PATTERN_META,
  type ChartPatternId,
} from "./chartPatternMeta";
import { CHART_PATTERN_HELP } from "./chartPatternHelpDetail";
import type { CandlePatternId } from "./evaluation/candlePatterns";
import type { FibExtraId, FibLevelRatio } from "./fibonacciStore";
import type { HelpContent } from "./indicatorHelp";
import { INDICATOR_HELP } from "./indicatorHelp";

export const CHART_LAYER_HELP = {
  ma: {
    title: "이동평균",
    summary:
      "가격의 평균 추세를 선으로 보여 줍니다. SMA는 단순 평균, EMA는 최근 가격에 더 가중치를 둡니다.",
    higher:
      "가격이 이동평균 위에 있으면 단기적으로 상승 우위·지지 후보로 보는 경우가 많습니다.",
    lower:
      "가격이 이동평균 아래에 있으면 하락 우위·저항 후보로 보는 경우가 많습니다.",
    tip: "단기·장기 선이 교차할 때(골든/데드 크로스) 추세 전환 힌트로 씁니다.",
  },
  volume: {
    title: "거래량",
    summary:
      "해당 봉에서 체결된 거래량입니다. 가격 움직임이 ‘얼마나 많은 참여’로 이뤄졌는지 봅니다.",
    higher:
      "거래량이 크면(또는 평균보다 크면) 그 방향의 움직임이 더 의미 있다고 보는 경우가 많습니다.",
    lower:
      "거래량이 작으면 가격이 움직여도 확신이 약한 ‘가벼운’ 움직임일 수 있습니다.",
    tip: "패널의 3/7/15/30 평균선과 비교해 최근 봉이 평소보다 붐비는지 확인하세요.",
  },
  swing: {
    title: "스윙 구조",
    summary:
      "최근 고점·저점의 상대 높이(HH/HL/LH/LL)로 상승·하락 구조를 표시합니다.",
    higher:
      "고점·저점이 이전보다 높아지면(HH·HL) 상승 구조가 유지·강화되는 흐름으로 봅니다.",
    lower:
      "고점·저점이 이전보다 낮아지면(LH·LL) 하락 구조가 유지·강화되는 흐름으로 봅니다.",
    tip: "HH+HL이면 상승 구조, LH+LL이면 하락 구조로 읽는 것이 기본입니다.",
  },
  trendlines: {
    title: "동적 추세선",
    summary:
      "스윙 고·저점을 이은 상승 지지·하락 저항 선입니다. 터치·유지 점수가 높은 선이 우선 표시됩니다.",
    higher:
      "가격이 상승 지지선 위에서 반응하면 상승 추세 유지, 하락 저항선을 돌파하면 하락 압력 완화로 봅니다.",
    lower:
      "상승 지지선이 깨지거나 하락 저항선 아래에서 막히면 추세 약화·지속 하락 쪽으로 봅니다.",
    tip: "선이 깨지면(이탈) 추세 약화 또는 전환 후보로 봅니다.",
  },
  sr: {
    title: "지지·저항",
    summary:
      "스윙 고·저점이 모인 수평 가격대(존)입니다. 한 점이 아니라 구간으로 표시됩니다.",
    higher:
      "저항을 돌파하거나 지지 위에서 버티면 상승 여력이 커진다고 보는 경우가 많습니다.",
    lower:
      "지지가 깨지거나 저항 아래에서 계속 막히면 하락·횡보 위험이 커진다고 보는 경우가 많습니다.",
    tip: "터치가 많고 반등이 잘 나온 존일수록 더 강하게 보는 편입니다.",
  },
  fib: {
    title: "피보나치 되돌림",
    summary:
      "직접 고른 저점·고점 사이에서 되돌림 비율(38.2%, 50%, 61.8% 등) 가격을 표시합니다.",
    higher:
      "되돌림이 얕을수록(예: 38.2% 근처에서 반등) 추세가 강한 편으로 해석하는 경우가 많습니다.",
    lower:
      "되돌림이 깊을수록(예: 61.8%~78.6%) 추세가 약하거나 전환 위험이 크다고 보는 경우가 많습니다.",
    tip: "지지·저항 존과 겹치면(컨플루언스) 더 주목하는 경우가 많습니다.",
  },
  fibLevels: {
    title: "되돌림 레벨",
    summary:
      "선택한 저점→고점 구간의 비율 가격선입니다. 조정 시 자주 반응하는 후보 가격대입니다.",
    higher:
      "가격이 레벨 위에서 버티면 그 레벨이 지지로 작용했다고 보는 경우가 많습니다.",
    lower:
      "가격이 레벨을 하향 이탈하면 다음 깊은 되돌림 레벨을 향할 수 있습니다.",
  },
  fibExtras: {
    title: "피보나치 차트 표현",
    summary: "앵커 가이드선과 지지·저항 겹침(컨플루언스) 강조 표시입니다.",
    tip: "숫자 라벨은 차트 선이 아니라 아래 범례에만 표시됩니다.",
  },
  aux: {
    title: "보조 지표 (패널)",
    summary:
      "가격과 Y축이 다른 오실레이터·변동성 지표를 차트 아래 별도 섹션에 그립니다.",
    tip: "RSI·MACD·MFI·ATR·%B는 가격 차트에 겹치지 않고 같은 시간축으로 함께 봅니다.",
  },
  bbPercentB: {
    title: "%B (볼린저 %B)",
    summary:
      "가격이 볼린저 밴드 안 어디에 있는지를 0~1 근처로 정규화한 값입니다. (하단=0, 중심=0.5, 상단=1)",
    higher:
      "%B가 높을수록(1 근처·이상) 상단 밴드 근처·밖으로, 단기 과열·추세 가속 후보로 봅니다.",
    lower:
      "%B가 낮을수록(0 근처·이하) 하단 밴드 근처·밖으로, 단기 과매도·눌림 후보로 봅니다.",
    tip: "밴드 자체와 함께 보면 ‘어디에 붙어 있는지’를 숫자로 확인할 수 있습니다.",
  },
  bbBands: {
    title: "볼린저 밴드 (선)",
    summary: INDICATOR_HELP.bb.summary,
    higher: INDICATOR_HELP.bb.higher,
    lower: INDICATOR_HELP.bb.lower,
    tip: INDICATOR_HELP.bb.tip,
  },
  bbStrategies: {
    title: "볼린저 전략 마커",
    summary:
      "밴드 터치·돌파·스퀴즈·다이버전스 등 규칙 기반 신호를 차트에 마커로 표시합니다.",
    tip: "전략마다 횡보/추세 가정이 다릅니다. 마커는 참고용이며 단독 진입 근거로 쓰기보다 맥락과 함께 보세요.",
  },
  classicalPatterns: {
    title: "차트 패턴",
    summary:
      "쌍바닥·쐐기·삼각형·깃발 등 고전적 가격 ‘모양’을 탐지합니다. 아래 전략과 분리되어 있습니다.",
    howToFind:
      "스윙 고·저점으로 형태를 찾고, 목선·채널·저항 종가 돌파 시 ‘완성’으로 표시됩니다. 각 항목 ?의 ‘찾는 법’을 참고하세요.",
    higherLabel: "돌파 시",
    lowerLabel: "실패 시",
    higher:
      "목선·저항을 돌파하면 패턴 방향(롱/숏) 신호가 확인된 것으로 보는 경우가 많습니다.",
    lower:
      "돌파에 실패하거나 패턴 구조를 깨면 신호가 무효·반대로 해석되는 경우가 많습니다.",
    tip: "모양(패턴)과 진입 규칙(전략)을 나눠 켜면 차트 읽기가 쉬워집니다.",
  },
  patternStrategies: {
    title: "차트 패턴 전략",
    summary:
      "탐지된 패턴 위에 얹는 매매 규칙입니다. 돌파 즉시 / 리테스트 / 거래량 확인 진입을 나눠 표시합니다.",
    howToFind:
      "패턴이 완성된 뒤, 선택한 전략 조건(돌파 봉·리테스트 확인 봉·거래량 배수)을 만족하는 봉에 마커가 생깁니다.",
    higherLabel: "돌파 시",
    lowerLabel: "실패 시",
    higher: "전략 조건이 충족되면 해당 방향 진입 후보로 표시합니다.",
    lower: "리테스트 실패·거래량 미달은 해당 전략 마커가 나오지 않거나 무효로 봅니다.",
    tip: "패턴 토글과 독립입니다. 모양은 켜고 진입 규칙만 골라 볼 수 있습니다.",
  },
  candlePatterns: {
    title: "캔들 패턴",
    summary:
      "망치형, 잉걸핑 등 단일·복합 캔들 형태를 탐지해 마커로 표시합니다. 롱·숏·중립으로 구분해 둡니다.",
    higherLabel: "돌파 시",
    lowerLabel: "실패 시",
    higher:
      "다음 봉이 패턴 방향으로 확인되면(종가·고저 돌파) 신호 신뢰도가 올라가는 편입니다.",
    lower:
      "패턴 고·저점이 깨지면 신호가 무효화될 수 있습니다. 단독 진입보다 맥락과 함께 보세요.",
    tip: "캔들 패턴은 단기 심리 힌트입니다. 추세·지지저항과 맞을 때 더 의미 있는 경우가 많습니다.",
  },
  bbUpper: {
    title: "볼린저 상단 밴드",
    summary: "중심선 + (표준편차×배수)입니다. 통계적으로 ‘상대적으로 높은’ 가격대 참고선입니다.",
    higher:
      "가격이 상단 근처에 붙거나 밖이면 단기 과열·추세 가속 구간으로 보는 경우가 많습니다.",
    lower:
      "가격이 상단에서 멀어지면(밴드 안쪽으로) 과열이 완화되거나 횡보로 들어가는 흐름일 수 있습니다.",
  },
  bbMiddle: {
    title: "볼린저 중심선",
    summary: "볼린저 계산에 쓰는 이동평균선입니다. 단기 추세의 중심 역할을 합니다.",
    higher:
      "가격이 중심선 위에 있으면 단기 강세 쪽으로 해석하는 경우가 많습니다.",
    lower:
      "가격이 중심선 아래면 단기 약세 쪽으로 해석하는 경우가 많습니다.",
  },
  bbLower: {
    title: "볼린저 하단 밴드",
    summary: "중심선 − (표준편차×배수)입니다. 통계적으로 ‘상대적으로 낮은’ 가격대 참고선입니다.",
    higher:
      "가격이 하단에서 벗어나 위로 올라오면 과매도 완화·반등 시도로 보는 경우가 많습니다.",
    lower:
      "가격이 하단 근처에 붙거나 밖이면 단기 과매도·하락 가속 구간으로 보는 경우가 많습니다.",
  },
} as const satisfies Record<string, HelpContent>;

export function swingHelp(id: string): HelpContent {
  const map: Record<string, HelpContent> = {
    HH: {
      title: "HH (Higher High)",
      summary: "이전 스윙 고점보다 더 높은 고점입니다.",
      higher: "상승 힘이 이어지고 있다는 신호로 봅니다.",
      tip: "HH만 나오고 HL이 깨지면 상승 구조가 약해질 수 있습니다.",
    },
    HL: {
      title: "HL (Higher Low)",
      summary: "이전 스윙 저점보다 더 높은 저점입니다.",
      higher: "조정 후에도 저점이 올라 상승 구조가 유지되는 신호로 봅니다.",
      tip: "HH와 함께 나오면 전형적인 상승 스윙 구조입니다.",
    },
    LH: {
      title: "LH (Lower High)",
      summary: "이전 스윙 고점보다 더 낮은 고점입니다.",
      lower: "고점이 내려오며 상승 힘이 약해지거나 하락 전환 징후로 봅니다.",
      tip: "LL과 함께 나오면 전형적인 하락 스윙 구조입니다.",
    },
    LL: {
      title: "LL (Lower Low)",
      summary: "이전 스윙 저점보다 더 낮은 저점입니다.",
      lower: "하락 구조가 이어지는 신호로 봅니다.",
      tip: "LL+LH에서 HH+HL로 바뀌면 상승 전환 후보입니다.",
    },
    bullish_transition: {
      title: "하락→상승 전환",
      summary: "LL+LH 구조에서 HH+HL 구조로 바뀌는 시점입니다.",
      higher: "매수 우위·추세 전환 후보로 주목합니다.",
      tip: "전환 직후 거래량·돌파 확인이 있으면 신뢰도가 올라가는 편입니다.",
    },
    bearish_transition: {
      title: "상승→하락 전환",
      summary: "HH+HL 구조에서 LL+LH 구조로 바뀌는 시점입니다.",
      lower: "매도 우위·추세 전환 후보로 주목합니다.",
      tip: "전환 후 지지 이탈이 동반되면 하락 가속 가능성이 커집니다.",
    },
  };
  return (
    map[id] ?? {
      title: id,
      summary: "스윙 구조 표시입니다.",
    }
  );
}

export function srHelp(id: "support" | "resistance"): HelpContent {
  if (id === "support") {
    return {
      title: "지지 가격대",
      summary:
        "스윙 저점이 모인 수평 구간입니다. 매수세가 나와 가격이 버티기 쉬운 영역으로 봅니다.",
      higher:
        "지지 위에서 버티면 반등·상승 지속 후보로, 지지를 상향 돌파한 뒤 재테스트하면 지지 강화로 보는 경우가 많습니다.",
      lower:
        "지지가 깨지면(종가 기준 이탈) 같은 구간이 저항으로 바뀌며 추가 하락 위험이 커질 수 있습니다.",
    };
  }
  return {
    title: "저항 가격대",
    summary:
      "스윙 고점이 모인 수평 구간입니다. 매도세가 나와 상승이 막히기 쉬운 영역으로 봅니다.",
    higher:
      "저항을 돌파하면 추세 가속 후보가 되고, 돌파 후 재테스트에서 버티면 지지로 역할이 바뀌는 경우가 많습니다.",
    lower:
      "저항 아래에서 계속 막히면 상승이 약하거나 되돌림·횡보 가능성이 큽니다.",
  };
}

export function trendlineKindHelp(
  kind: "ascending" | "descending",
): HelpContent {
  if (kind === "ascending") {
    return {
      title: "상승 추세선 (지지)",
      summary: "스윙 저점을 이은 상승 지지선입니다.",
      higher:
        "가격이 선 위에서 반응하면 상승 추세 유지·매수 관심 구간으로 봅니다.",
      lower:
        "선이 깨지면(이탈) 상승 추세 약화 또는 전환 후보로 봅니다.",
    };
  }
  return {
    title: "하락 추세선 (저항)",
    summary: "스윙 고점을 이은 하락 저항선입니다.",
    higher:
      "선을 상향 돌파하면 하락 압력 완화·반등 후보로 봅니다.",
    lower:
      "가격이 선 아래에서 막히면 하락 추세 유지·매도 압력으로 봅니다.",
  };
}

export function auxHelp(id: AuxIndicatorId): HelpContent {
  if (id === "bbPercentB") return CHART_LAYER_HELP.bbPercentB;
  return INDICATOR_HELP[id];
}

export function fibLevelHelp(ratio: FibLevelRatio): HelpContent {
  const map: Record<FibLevelRatio, HelpContent> = {
    0.382: {
      title: "38.2% 되돌림",
      summary: "상승(또는 하락) 폭의 약 38%만 되돌린 얕은 조정 구간입니다.",
      higher:
        "이 근처에서 반등하면 추세가 강한 편으로 해석하는 경우가 많습니다.",
      lower:
        "38.2%를 깨면 50%·61.8% 등 더 깊은 되돌림을 볼 가능성이 커집니다.",
    },
    0.5: {
      title: "50% 되돌림",
      summary: "이동 폭의 절반을 되돌린 구간입니다. 심리적 중간 지지·저항으로 자주 봅니다.",
      higher:
        "50% 위에서 버티면 기존 추세 지속 후보로 보는 경우가 많습니다.",
      lower:
        "50%를 하향 이탈하면 61.8% 등 더 깊은 조정을 염두에 둡니다.",
    },
    0.618: {
      title: "61.8% 되돌림 (황금비율)",
      summary: "피보나치에서 가장 많이 보는 ‘황금’ 되돌림 구간입니다.",
      higher:
        "61.8% 근처에서 반등하면 추세 재개 후보로 주목하는 경우가 많습니다.",
      lower:
        "61.8%를 깨면 78.6%까지 깊어지거나 추세 전환 위험이 커질 수 있습니다.",
    },
    0.786: {
      title: "78.6% 되돌림",
      summary: "거의 전 구간을 되돌린 깊은 조정입니다. 마지막 지지·저항 후보로 봅니다.",
      higher:
        "여기까지 왔다가 반등하면 ‘깊은 매수/매도’ 구간 반응으로 보는 경우가 있습니다.",
      lower:
        "78.6%마저 깨지면 앵커 고·저점(0%/100%) 돌파·추세 무효 후보로 봅니다.",
    },
  };
  return map[ratio];
}

export function fibExtraHelp(id: FibExtraId): HelpContent {
  if (id === "anchors") {
    return {
      title: "0% / 100% 가이드",
      summary:
        "직접 고른 저점(0%)·고점(100%) 기준선입니다. 되돌림 계산의 양 끝입니다.",
      tip: "가격 숫자는 차트 선이 아니라 아래 범례에만 표시됩니다.",
    };
  }
  return {
    title: "Confluence 강조",
    summary:
      "피보나치 레벨이 지지·저항 존과 겹칠 때 그 구간을 더 눈에 띄게 표시합니다.",
    higher:
      "겹침이 있으면 그 가격대 반응(지지·저항)을 더 신뢰하는 경우가 많습니다.",
    tip: "겹침만으로 진입하지 말고, 종가·거래량 확인과 함께 보세요.",
  };
}

const PATTERN_OUTCOME_LABELS = {
  higherLabel: "돌파 시",
  lowerLabel: "실패 시",
} as const;

export function classicalPatternHelp(id: ChartPatternId): HelpContent {
  const detailed = CHART_PATTERN_HELP[id];
  if (detailed) return detailed;

  const meta = CHART_PATTERN_META[id];
  return {
    title: meta.labelKo,
    summary: meta.description,
    ...PATTERN_OUTCOME_LABELS,
  };
}

export function candlePatternHelp(id: CandlePatternId): HelpContent {
  const meta: CandlePatternMeta = CANDLE_PATTERN_META[id];
  const biasLabel =
    meta.typicalDirection === "bullish"
      ? "롱"
      : meta.typicalDirection === "bearish"
        ? "숏"
        : "중립";

  let higher: string;
  let lower: string;
  if (meta.typicalDirection === "bullish") {
    higher =
      "다음 봉이 패턴 고점을 넘거나 양봉으로 확인되면 롱·반등 신호 신뢰도가 올라갑니다.";
    lower =
      "패턴 저점이 깨지면 롱 신호가 무효화될 수 있습니다.";
  } else if (meta.typicalDirection === "bearish") {
    higher =
      "다음 봉이 패턴 저점을 깨거나 음봉으로 확인되면 숏·조정 신호 신뢰도가 올라갑니다.";
    lower =
      "패턴 고점을 다시 돌파하면 숏 신호가 무효화될 수 있습니다.";
  } else {
    higher =
      "다음 봉이 위쪽으로 강하게 돌파하면 매수 유입·추세 재개 쪽으로 읽기도 합니다.";
    lower =
      "다음 봉이 아래쪽으로 깨지면 매도 압력·추세 약화 쪽으로 읽기도 합니다.";
  }

  return {
    title: `${meta.labelKo} (${biasLabel})`,
    summary: meta.description,
    ...PATTERN_OUTCOME_LABELS,
    higher,
    lower,
    tip: "단일 캔들 신호는 추세·지지저항과 맞을 때 더 신뢰도가 올라가는 편입니다.",
  };
}

export function bbStrategyHelp(id: string): HelpContent {
  const map: Record<string, HelpContent> = {
    band_sr: {
      title: "밴드 지지·저항",
      summary:
        "횡보 구간에서 하단 터치 매수·상단 터치 매도 아이디어입니다.",
      tip: "추세가 강한 날에는 밴드 터치만으로 진입하면 역추세가 될 수 있습니다.",
    },
    band_breakout: {
      title: "밴드 돌파",
      summary: "추세 방향으로 밴드 돌파가 이어질 때 추세 추종 진입 아이디어입니다.",
      tip: "첫 돌파보다 같은 방향 재돌파·거래량 동반을 보면 허위 돌파를 줄일 수 있습니다.",
    },
    squeeze: {
      title: "스퀴즈",
      summary: "밴드 폭이 좁아진 뒤 상·하단 돌파 방향으로 변동성 확대를 노립니다.",
      tip: "헤드페이크(가짜 돌파)가 잦으니 손절과 확인 봉이 중요합니다.",
    },
    trend_follow: {
      title: "추세 추종 (%B+MFI)",
      summary:
        "%B와 MFI가 함께 극단일 때 그 방향으로 추세를 따라가는 신호입니다.",
      higher: "%B·MFI가 높으면 상승 추세 강도가 크다는 쪽으로 해석합니다.",
      lower: "%B·MFI가 낮으면 하락 추세 강도가 크다는 쪽으로 해석합니다.",
    },
    divergence: {
      title: "BB–RSI 다이버전스",
      summary:
        "밴드 터치와 RSI 방향이 어긋난 뒤 중심선 돌파 시 반전 후보로 봅니다.",
      tip: "다이버전스만으로 진입하기보다 구조·지지저항 확인과 함께 쓰는 편이 안전합니다.",
    },
  };
  return (
    map[id] ?? {
      title: id,
      summary: "볼린저 기반 전략 마커입니다.",
    }
  );
}
