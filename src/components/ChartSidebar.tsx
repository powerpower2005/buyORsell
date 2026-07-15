import { useMemo, useState } from "react";
import clsx from "clsx";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  getIndicatorOverlayVisibility,
  isVolumeOverlayVisible,
  setIndicatorOverlayGroupVisible,
  setIndicatorOverlayVisible,
  setVolumeOverlayVisible,
} from "@/lib/indicatorOverlayStore";
import {
  CANDLE_PATTERN_META,
  CANDLE_PATTERN_ORDER,
} from "@/lib/candlePatternMeta";
import {
  getChartPatternVisibility,
  setChartPatternVisible,
} from "@/lib/candlePatternStore";
import {
  SWING_CHART_TOGGLE_META,
  SWING_CHART_TOGGLE_ORDER,
  getSwingChartVisibility,
  setSwingChartVisible,
} from "@/lib/swingStructureStore";
import {
  SR_CHART_TOGGLE_META,
  SR_CHART_TOGGLE_ORDER,
  getSrChartVisibility,
  setSrChartVisible,
} from "@/lib/srZoneStore";
import {
  TRENDLINE_CHART_TOGGLE_META,
  TRENDLINE_CHART_TOGGLE_ORDER,
  getTrendlineChartVisibility,
  setTrendlineChartVisible,
  type TrendlineChartToggleId,
} from "@/lib/trendlineStore";
import {
  FIB_LEVEL_COLORS,
  FIB_RETRACEMENT_LEVELS,
  clearFibRetracement,
  fibLevelLabel,
  getFibLevelVisibility,
  getFibPendingLow,
  getFibRetracement,
  isFibDrawMode,
  setAllFibLevelsVisible,
  setFibDrawMode,
  setFibLevelVisible,
  setFibPendingLow,
  type FibLevelRatio,
} from "@/lib/fibonacciStore";
import type { CandlePatternId } from "@/lib/evaluation/candlePatterns";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import type { SrChartToggleId } from "@/lib/srZoneStore";

interface Props {
  /** Bumps when any visibility store changes (parent tick). */
  visibilityTick: number;
  onVisibilityChange: () => void;
  className?: string;
}

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      className="h-3.5 w-3.5 shrink-0 accent-accent"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminate) && !checked;
      }}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

function Group({
  title,
  open,
  onToggleOpen,
  checked,
  indeterminate,
  onToggleAll,
  children,
  colorDot,
}: {
  title: string;
  open: boolean;
  onToggleOpen: () => void;
  checked: boolean;
  indeterminate?: boolean;
  onToggleAll: (next: boolean) => void;
  children: React.ReactNode;
  colorDot?: string;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <TriCheckbox
          checked={checked}
          indeterminate={indeterminate}
          onChange={onToggleAll}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-medium text-text-primary"
          onClick={onToggleOpen}
        >
          <span className="text-text-tertiary">{open ? "▾" : "▸"}</span>
          {colorDot && (
            <span
              className="inline-block h-1.5 w-3 rounded-sm"
              style={{ backgroundColor: colorDot }}
            />
          )}
          <span className="truncate">{title}</span>
        </button>
      </div>
      {open && <div className="space-y-0.5 pb-2 pl-7 pr-2">{children}</div>}
    </div>
  );
}

function Leaf({
  label,
  checked,
  onChange,
  color,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  color?: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-surface-elevated/60">
      <input
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          {color && (
            <span
              className="inline-block h-0.5 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="truncate">{label}</span>
        </span>
        {hint && (
          <span className="mt-0.5 block text-[10px] leading-snug text-text-tertiary">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

function groupState(values: boolean[]): {
  checked: boolean;
  indeterminate: boolean;
} {
  const on = values.filter(Boolean).length;
  return {
    checked: values.length > 0 && on === values.length,
    indeterminate: on > 0 && on < values.length,
  };
}

export function ChartSidebar({
  visibilityTick,
  onVisibilityChange,
  className,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    ma: true,
    sma: true,
    ema: true,
    swing: false,
    sr: false,
    trendlines: true,
    patterns: false,
    fib: true,
    volume: true,
  });

  const smaCfg = useMemo(() => getIndicatorConfig("sma"), [visibilityTick]);
  const emaCfg = useMemo(() => getIndicatorConfig("ema"), [visibilityTick]);

  const smaPeriods = (smaCfg?.params.periods as number[]) ?? [];
  const emaPeriods = (emaCfg?.params.periods as number[]) ?? [];
  const smaColors = parsePeriodColors(smaCfg?.params.colors);
  const emaColors = parsePeriodColors(emaCfg?.params.colors);

  const smaVis = useMemo(
    () => getIndicatorOverlayVisibility("sma", smaPeriods),
    [smaPeriods.join(","), visibilityTick],
  );
  const emaVis = useMemo(
    () => getIndicatorOverlayVisibility("ema", emaPeriods),
    [emaPeriods.join(","), visibilityTick],
  );
  const patternVis = useMemo(
    () => getChartPatternVisibility(),
    [visibilityTick],
  );
  const swingVis = useMemo(() => getSwingChartVisibility(), [visibilityTick]);
  const srVis = useMemo(() => getSrChartVisibility(), [visibilityTick]);
  const volumeVis = useMemo(() => isVolumeOverlayVisible(), [visibilityTick]);
  const fibVis = useMemo(() => getFibLevelVisibility(), [visibilityTick]);
  const fibDraw = useMemo(() => isFibDrawMode(), [visibilityTick]);
  const fibRet = useMemo(() => getFibRetracement(), [visibilityTick]);
  const fibPending = useMemo(() => getFibPendingLow(), [visibilityTick]);
  const tlVis = useMemo(() => getTrendlineChartVisibility(), [visibilityTick]);

  const bump = (fn: () => void) => {
    fn();
    onVisibilityChange();
  };

  const toggleOpen = (key: string) =>
    setOpen((s) => ({ ...s, [key]: !s[key] }));

  const smaVals = smaPeriods.map((p) => smaVis[p]);
  const emaVals = emaPeriods.map((p) => emaVis[p]);
  const maVals = [...smaVals, ...emaVals];
  const maState = groupState(maVals);
  const smaState = groupState(smaVals);
  const emaState = groupState(emaVals);
  const swingState = groupState(SWING_CHART_TOGGLE_ORDER.map((id) => swingVis[id]));
  const srState = groupState(SR_CHART_TOGGLE_ORDER.map((id) => srVis[id]));
  const patternState = groupState(
    CANDLE_PATTERN_ORDER.map((id) => patternVis[id]),
  );
  const fibState = groupState(
    FIB_RETRACEMENT_LEVELS.map((r) => fibVis[r]),
  );
  const tlState = groupState(
    TRENDLINE_CHART_TOGGLE_ORDER.map((id) => tlVis[id]),
  );

  return (
    <aside
      className={clsx(
        "rounded-xl border border-border bg-surface text-left",
        className,
      )}
    >
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-xs font-semibold text-text-primary">차트 레이어</p>
        <p className="mt-0.5 text-[10px] text-text-tertiary">
          켜고 끄기 · 자세한 분석은 아래 패널
        </p>
      </div>

      <div className="max-h-[min(70vh,640px)] overflow-y-auto">
        <Group
          title="이동평균"
          open={open.ma}
          onToggleOpen={() => toggleOpen("ma")}
          checked={maState.checked}
          indeterminate={maState.indeterminate}
          onToggleAll={(next) =>
            bump(() => {
              setIndicatorOverlayGroupVisible("sma", smaPeriods, next);
              setIndicatorOverlayGroupVisible("ema", emaPeriods, next);
            })
          }
        >
          <Group
            title="SMA"
            open={open.sma}
            onToggleOpen={() => toggleOpen("sma")}
            checked={smaState.checked}
            indeterminate={smaState.indeterminate}
            onToggleAll={(next) =>
              bump(() =>
                setIndicatorOverlayGroupVisible("sma", smaPeriods, next),
              )
            }
          >
            {smaPeriods.map((period, i) => (
              <Leaf
                key={`sma-${period}`}
                label={`SMA ${period}`}
                checked={smaVis[period]}
                color={resolvePeriodColor(smaColors, period, i)}
                onChange={(next) =>
                  bump(() => setIndicatorOverlayVisible("sma", period, next))
                }
              />
            ))}
            {!smaPeriods.length && (
              <p className="px-1.5 text-[10px] text-text-tertiary">기간 없음</p>
            )}
          </Group>

          <Group
            title="EMA"
            open={open.ema}
            onToggleOpen={() => toggleOpen("ema")}
            checked={emaState.checked}
            indeterminate={emaState.indeterminate}
            onToggleAll={(next) =>
              bump(() =>
                setIndicatorOverlayGroupVisible("ema", emaPeriods, next),
              )
            }
          >
            {emaPeriods.map((period, i) => (
              <Leaf
                key={`ema-${period}`}
                label={`EMA ${period}`}
                checked={emaVis[period]}
                color={resolvePeriodColor(emaColors, period, i)}
                onChange={(next) =>
                  bump(() => setIndicatorOverlayVisible("ema", period, next))
                }
              />
            ))}
            {!emaPeriods.length && (
              <p className="px-1.5 text-[10px] text-text-tertiary">기간 없음</p>
            )}
          </Group>
        </Group>

        <div className="border-b border-border px-2.5 py-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-accent"
              checked={volumeVis}
              onChange={(e) =>
                bump(() => setVolumeOverlayVisible(e.target.checked))
              }
            />
            <span className="text-xs font-medium text-text-primary">거래량</span>
          </label>
        </div>

        <Group
          title="스윙 구조"
          open={open.swing}
          onToggleOpen={() => toggleOpen("swing")}
          checked={swingState.checked}
          indeterminate={swingState.indeterminate}
          onToggleAll={(next) =>
            bump(() => {
              for (const id of SWING_CHART_TOGGLE_ORDER) {
                setSwingChartVisible(id, next);
              }
            })
          }
        >
          {SWING_CHART_TOGGLE_ORDER.map((id: SwingChartToggleId) => (
            <Leaf
              key={id}
              label={SWING_CHART_TOGGLE_META[id].labelKo}
              hint={SWING_CHART_TOGGLE_META[id].label}
              checked={swingVis[id]}
              onChange={(next) => bump(() => setSwingChartVisible(id, next))}
            />
          ))}
        </Group>

        <Group
          title="동적 추세선"
          open={open.trendlines}
          onToggleOpen={() => toggleOpen("trendlines")}
          checked={tlState.checked}
          indeterminate={tlState.indeterminate}
          onToggleAll={(next) =>
            bump(() => {
              for (const id of TRENDLINE_CHART_TOGGLE_ORDER) {
                setTrendlineChartVisible(id, next);
              }
            })
          }
        >
          {TRENDLINE_CHART_TOGGLE_ORDER.map((id: TrendlineChartToggleId) => (
            <Leaf
              key={id}
              label={TRENDLINE_CHART_TOGGLE_META[id].labelKo}
              hint={TRENDLINE_CHART_TOGGLE_META[id].description}
              color={id === "ascending" ? "#34d399" : "#fb7185"}
              checked={tlVis[id]}
              onChange={(next) =>
                bump(() => setTrendlineChartVisible(id, next))
              }
            />
          ))}
        </Group>

        <Group
          title="지지·저항"
          open={open.sr}
          onToggleOpen={() => toggleOpen("sr")}
          checked={srState.checked}
          indeterminate={srState.indeterminate}
          onToggleAll={(next) =>
            bump(() => {
              for (const id of SR_CHART_TOGGLE_ORDER) {
                setSrChartVisible(id, next);
              }
            })
          }
        >
          {SR_CHART_TOGGLE_ORDER.map((id: SrChartToggleId) => (
            <Leaf
              key={id}
              label={SR_CHART_TOGGLE_META[id].labelKo}
              checked={srVis[id]}
              onChange={(next) => bump(() => setSrChartVisible(id, next))}
            />
          ))}
        </Group>

        <div className="border-b border-border">
          <Group
            title="피보나치 되돌림"
            open={open.fib}
            onToggleOpen={() => toggleOpen("fib")}
            checked={fibState.checked}
            indeterminate={fibState.indeterminate}
            onToggleAll={(next) => bump(() => setAllFibLevelsVisible(next))}
          >
            {FIB_RETRACEMENT_LEVELS.map((ratio: FibLevelRatio) => (
              <Leaf
                key={ratio}
                label={fibLevelLabel(ratio)}
                color={FIB_LEVEL_COLORS[ratio]}
                checked={fibVis[ratio]}
                onChange={(next) =>
                  bump(() => setFibLevelVisible(ratio, next))
                }
              />
            ))}
            <div className="mt-2 space-y-1.5 px-1.5">
              <button
                type="button"
                className={clsx(
                  "w-full rounded-md border px-2 py-1.5 text-left text-xs font-medium",
                  fibDraw
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-bg text-text-secondary hover:border-accent/40",
                )}
                onClick={() =>
                  bump(() => {
                    const next = !fibDraw;
                    setFibDrawMode(next);
                    if (next) {
                      setFibPendingLow(null);
                    } else {
                      setFibPendingLow(null);
                    }
                  })
                }
              >
                {fibDraw
                  ? fibPending
                    ? "그리기 중 · 고점 클릭"
                    : "그리기 중 · 저점 클릭"
                  : "차트에서 저점→고점 그리기"}
              </button>
              {(fibRet || fibPending) && (
                <button
                  type="button"
                  className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-left text-xs text-text-tertiary hover:text-negative"
                  onClick={() =>
                    bump(() => {
                      clearFibRetracement();
                      setFibPendingLow(null);
                      setFibDrawMode(false);
                    })
                  }
                >
                  피보나치 지우기
                </button>
              )}
              <p className="text-[10px] leading-snug text-text-tertiary">
                저점 클릭 후 고점 클릭. 피보 레벨이 지지·저항에 겹치면
                Confluence로 강조됩니다.
              </p>
            </div>
          </Group>
        </div>

        <Group
          title="캔들 패턴"
          open={open.patterns}
          onToggleOpen={() => toggleOpen("patterns")}
          checked={patternState.checked}
          indeterminate={patternState.indeterminate}
          onToggleAll={(next) =>
            bump(() => {
              for (const id of CANDLE_PATTERN_ORDER) {
                setChartPatternVisible(id, next);
              }
            })
          }
        >
          {CANDLE_PATTERN_ORDER.map((id: CandlePatternId) => (
            <Leaf
              key={id}
              label={CANDLE_PATTERN_META[id].labelKo}
              hint={CANDLE_PATTERN_META[id].label}
              checked={patternVis[id]}
              onChange={(next) => bump(() => setChartPatternVisible(id, next))}
            />
          ))}
        </Group>
      </div>
    </aside>
  );
}
