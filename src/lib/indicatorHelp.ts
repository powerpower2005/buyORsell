/** Help copy for IndicatorConfigForm (? popups). */

export interface HelpContent {
  title: string;
  summary: string;
  /** What happens when the related value is higher. */
  higher?: string;
  /** What happens when the related value is lower. */
  lower?: string;
  tip?: string;
}

export const INDICATOR_HELP: Record<string, HelpContent> = {
  sma: {
    title: "SMA (단순이동평균)",
    summary:
      "최근 N개 봉의 종가를 단순 평균한 선입니다. 가격 추세의 중심선·지지/저항 참고로 씁니다.",
    tip: "기간이 짧을수록 가격을 빠르게 따라가고, 길수록 완만한 추세선이 됩니다. 여러 Period를 겹쳐 골든크로스 등을 봅니다.",
  },
  ema: {
    title: "EMA (지수이동평균)",
    summary:
      "최근 가격에 더 큰 가중치를 준 이동평균입니다. SMA보다 반응이 빠른 편입니다.",
    tip: "단기·장기 EMA를 함께 두면 추세 전환을 빨리 포착하는 데 도움이 됩니다.",
  },
  rsi: {
    title: "RSI (상대강도지수)",
    summary:
      "최근 상승·하락 폭의 비율로 0~100 사이 모멘텀을 나타냅니다. 과매수·과매도 판단에 쓰입니다.",
    tip: "일반적으로 70 근처는 과매수, 30 근처는 과매도로 봅니다. 강한 추세에서는 신호가 일찍 나올 수 있습니다.",
  },
  macd: {
    title: "MACD",
    summary:
      "단기·장기 EMA 차이와 그 신호선으로 추세·모멘텀을 봅니다. Hist(히스토그램)는 두 선의 간격을 나타냅니다.",
    tip: "MACD가 신호선을 상향 돌파하면 매수 모멘텀, 하향 돌파하면 매도 모멘텀으로 해석하는 경우가 많습니다.",
  },
  bb: {
    title: "Bollinger Bands (볼린저 밴드)",
    summary:
      "이동평균(중심선)과 표준편차로 상·하단 밴드를 그립니다. 변동성·과열·눌림을 보는 데 씁니다.",
    tip: "밴드가 좁아지면(스퀴즈) 변동성 확대 전조로, 가격이 밴드 밖을 벗어나면 추세 가속 또는 되돌림 후보로 봅니다.",
  },
  mfi: {
    title: "MFI (자금흐름지수)",
    summary:
      "가격과 거래량을 함께 반영한 0~100 모멘텀입니다. RSI와 비슷하지만 거래량 가중치가 있습니다.",
    tip: "보통 80 이상은 과매수, 20 이하는 과매도 구간으로 참고합니다.",
  },
  atr: {
    title: "ATR (평균진폭)",
    summary:
      "최근 봉의 고저·갭을 반영한 변동성(진폭) 지표입니다. 손절·목표가 폭을 잡을 때 자주 씁니다.",
    tip: "ATR이 크면 변동성이 크고, 작으면 조용한 구간입니다. 방향(상승/하락)이 아니라 크기만 봅니다.",
  },
};

export const PARAM_HELP: Record<string, HelpContent> = {
  "ma.period": {
    title: "Period (기간)",
    summary: "이동평균에 포함할 최근 봉의 개수입니다.",
    higher:
      "값이 커질수록 선이 완만해지고 노이즈가 줄어듭니다. 추세는 느리게 따라가고, 단기 움직임에는 둔감해집니다.",
    lower:
      "값이 작아질수록 가격에 민감하게 붙어 반응합니다. 신호가 빨라지지만 가짜 신호(휩쏘)도 늘어납니다.",
    tip: "단기(예: 12~20)는 민감, 장기(예: 50~200)는 큰 추세 확인용으로 쓰는 경우가 많습니다.",
  },
  "ma.color": {
    title: "색상",
    summary: "차트에 그리는 이동평균 선의 색입니다. 계산값에는 영향이 없습니다.",
    tip: "기간이 여러 개일 때 서로 구분되도록 다른 색을 쓰면 읽기 쉽습니다.",
  },
  "rsi.period": {
    title: "Period (기간)",
    summary: "RSI를 계산할 때 보는 최근 봉의 개수입니다. 기본값은 보통 14입니다.",
    higher:
      "기간이 길수록 RSI가 완만해지고 과매수·과매도 진입이 줄어듭니다. 신호가 늦어지지만 잡음이 적습니다.",
    lower:
      "기간이 짧을수록 RSI가 민감하게 오르내립니다. 신호가 빨라지지만 잦은 과매수·과매도 표시가 날 수 있습니다.",
  },
  "rsi.overbought": {
    title: "Overbought (과매수 기준)",
    summary: "RSI가 이 값을 넘으면 과매수로 보는 기준선입니다.",
    higher:
      "기준을 높이면(예: 80) 과매수 판정이 더 드물어집니다. 강한 상승장에서 너무 일찍 매도 신호로 보지 않게 됩니다.",
    lower:
      "기준을 낮추면(예: 65) 과매수로 더 자주 잡힙니다. 민감하지만 추세장에서는 성급한 신호가 될 수 있습니다.",
  },
  "rsi.oversold": {
    title: "Oversold (과매도 기준)",
    summary: "RSI가 이 값 아래로 가면 과매도로 보는 기준선입니다.",
    higher:
      "기준을 높이면(예: 40) 과매도 판정이 더 자주 납니다. 반등 후보를 일찍 보지만 하락 추세에서는 성급할 수 있습니다.",
    lower:
      "기준을 낮추면(예: 20) 과매도가 더 극단적일 때만 잡힙니다. 신호는 드물지만 신뢰도가 높아질 수 있습니다.",
  },
  "macd.fast": {
    title: "Fast (단기 EMA)",
    summary: "MACD의 빠른 EMA 기간입니다. Slow보다 짧아야 합니다.",
    higher:
      "Fast를 키우면(Slow에 가까워지면) MACD 선이 둔해지고 교차 신호가 줄어듭니다.",
    lower:
      "Fast를 줄이면 단기 움직임에 더 민감해져 Hist·교차가 잦아집니다.",
  },
  "macd.slow": {
    title: "Slow (장기 EMA)",
    summary: "MACD의 느린 EMA 기간입니다. Fast보다 길어야 합니다.",
    higher:
      "Slow를 키우면 장기 추세 쪽에 더 맞춰져 MACD가 완만해지고 신호가 늦어집니다.",
    lower:
      "Slow를 줄이면(Fast에 가까워지면) 두 선의 차이가 작아져 신호가 자주·민감해집니다.",
  },
  "macd.signal": {
    title: "Signal (신호선)",
    summary: "MACD 선을 다시 이동평균한 신호선 기간입니다.",
    higher:
      "신호선이 완만해져 교차가 덜 나고, 확정된 모멘텀 변화에 가깝게 반응합니다.",
    lower:
      "신호선이 민감해져 교차가 잦아집니다. 반응이 빠르지만 휩쏘도 늘 수 있습니다.",
  },
  "bb.period": {
    title: "Period (기간)",
    summary: "중심선(중간 밴드) 이동평균과 표준편차를 계산하는 봉 개수입니다.",
    higher:
      "밴드가 완만해지고 폭 변화가 느려집니다. 큰 변동성 국면을 보는 데 유리합니다.",
    lower:
      "밴드가 가격에 더 타이트하게 붙습니다. 단기 변동·돌파에 민감해집니다.",
  },
  "bb.stdDev": {
    title: "Std Dev (표준편차 배수)",
    summary: "중심선에서 상·하단 밴드를 얼마나 멀리 둘지 정하는 배수입니다. 기본은 보통 2입니다.",
    higher:
      "밴드가 넓어집니다. 가격이 밴드 밖으로 나가는 일이 줄어들고, ‘극단’ 판정이 까다로워집니다.",
    lower:
      "밴드가 좁아집니다. 가격이 밴드를 더 자주 건드리고, 돌파·수축 신호가 민감해집니다.",
  },
  "bb.color": {
    title: "밴드 색상",
    summary: "상단·중간·하단 밴드를 차트에서 구분하기 위한 색입니다. 계산에는 영향이 없습니다.",
  },
  "mfi.period": {
    title: "Period (기간)",
    summary: "MFI를 계산할 때 보는 최근 봉의 개수입니다.",
    higher:
      "값이 커질수록 MFI가 완만해지고 과매수·과매도 진입이 줄어듭니다.",
    lower:
      "값이 작아질수록 거래량·가격 변화에 민감하게 출렁입니다.",
  },
  "atr.period": {
    title: "Period (기간)",
    summary: "ATR(평균 진폭)을 계산할 때 쓰는 최근 봉의 개수입니다.",
    higher:
      "변동성 추정치가 완만해져 갑작스런 스파이크에 덜 흔들립니다. 손절 폭이 상대적으로 안정적입니다.",
    lower:
      "최근 진폭에 더 민감합니다. 변동이 커진 직후 ATR이 빨리 올라 손절 폭이 넓어질 수 있습니다.",
  },
};
