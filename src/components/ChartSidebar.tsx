import { useMemo, useState } from "react";
import clsx from "clsx";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  BB_BAND_META,
  BB_BAND_ORDER,
  resolveBbBandColor,
  type BbBandId,
} from "@/lib/bbOverlay";
import {
  BB_STRATEGY_META,
  BB_STRATEGY_ORDER,
  type BbStrategyId,
} from "@/lib/bbStrategyMeta";
import {
  getBbStrategyVisibility,
  setBbStrategyGroupVisible,
  setBbStrategyVisible,
} from "@/lib/bbStrategyStore";
import {
  getBbOverlayVisibility,
  getIndicatorOverlayVisibility,
  isVolumeOverlayVisible,
  setBbOverlayGroupVisible,
  setBbOverlayVisible,
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
  CHART_PATTERN_META,
  CHART_PATTERN_ORDER,
  type ChartPatternId,
} from "@/lib/chartPatternMeta";
import {
  getClassicalChartPatternVisibility,
  setClassicalChartPatternGroupVisible,
  setClassicalChartPatternVisible,
} from "@/lib/chartPatternStore";
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
  TRENDLINE_COLOR_OPTIONS,
  getTrendlineChartVisibility,
  getTrendlineKindColors,
  getTrendlineLineColors,
  getTrendlineLineVisibility,
  setTrendlineChartVisible,
  setTrendlineKindColor,
  setTrendlineLineColor,
  setTrendlineLineVisible,
  setTrendlineLinesVisible,
  type TrendlineChartToggleId,
} from "@/lib/trendlineStore";
import {
  FIB_EXTRA_META,
  FIB_EXTRA_ORDER,
  FIB_LEVEL_COLORS,
  FIB_RETRACEMENT_LEVELS,
  clearFibRetracement,
  fibLevelLabel,
  getFibExtraVisibility,
  getFibLevelVisibility,
  getFibPendingLow,
  getFibRetracement,
  isFibDrawMode,
  setAllFibExtrasVisible,
  setAllFibLevelsVisible,
  setFibDrawMode,
  setFibExtraVisible,
  setFibLevelVisible,
  setFibPendingLow,
  type FibExtraId,
  type FibLevelRatio,
} from "@/lib/fibonacciStore";
import {
  AUX_INDICATOR_META,
  AUX_INDICATOR_ORDER,
  getAuxIndicatorVisibility,
  setAuxIndicatorGroupVisible,
  setAuxIndicatorVisible,
  type AuxIndicatorId,
} from "@/lib/auxIndicatorStore";
import {
  getSidebarOpenState,
  isChartSidebarCollapsed,
  setChartSidebarCollapsed,
  toggleSidebarOpenKey,
  type SidebarOpenKey,
  type SidebarOpenState,
} from "@/lib/sidebarOpenStore";
import type { CandlePatternId } from "@/lib/evaluation/candlePatterns";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import type { SrChartToggleId } from "@/lib/srZoneStore";
import type { Trendline, TrendlineResult } from "@/lib/evaluation/trendlines";

const EMPTY_TRENDLINES: Trendline[] = [];

interface Props {
  /** Bumps when any visibility store changes (parent tick). */
  visibilityTick: number;
  /** Also bump when indicator config (periods/colors) changes. */
  configTick?: number;
  onVisibilityChange: () => void;
  /** Opens SMA/EMA/… CRUD modal (parent-owned). */
  onOpenIndicatorConfig?: () => void;
  /** Current evaluation trendlines for per-line toggles. */
  trendlines?: TrendlineResult | null;
  className?: string;
}

function trendlineLeafLabel(line: Trendline, index: number): string {
  const arrow = line.kind === "ascending" ? "↑" : "↓";
  return `${arrow} #${index + 1} · 터치 ${line.touches} · 점수 ${line.score}`;
}

function trendlineLeafHint(line: Trendline): string {
  return line.broken ? "이탈됨" : `${line.date1} → ${line.date2}`;
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
  colorValue,
  onColorChange,
  colorOptions,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  color?: string;
  hint?: string;
  colorValue?: string;
  onColorChange?: (color: string) => void;
  colorOptions?: readonly string[];
}) {
  return (
    <div className="rounded px-1.5 py-1 hover:bg-surface-elevated/60">
      <label className="flex cursor-pointer items-start gap-2">
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
      {colorValue && onColorChange && (
        <div className="mt-1.5 pl-5">
          <ColorSwatchPicker
            value={colorValue}
            onChange={onColorChange}
            options={colorOptions}
            size="sm"
          />
        </div>
      )}
    </div>
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
  configTick = 0,
  onVisibilityChange,
  onOpenIndicatorConfig,
  trendlines,
  className,
}: Props) {
  const [open, setOpen] = useState<SidebarOpenState>(() => getSidebarOpenState());
  const [collapsed, setCollapsed] = useState(() => isChartSidebarCollapsed());
  const refreshTick = visibilityTick + configTick;

  const smaCfg = useMemo(() => getIndicatorConfig("sma"), [refreshTick]);
  const emaCfg = useMemo(() => getIndicatorConfig("ema"), [refreshTick]);
  const bbCfg = useMemo(() => getIndicatorConfig("bb"), [refreshTick]);

  const smaPeriods = (smaCfg?.params.periods as number[]) ?? [];
  const emaPeriods = (emaCfg?.params.periods as number[]) ?? [];
  const smaColors = parsePeriodColors(smaCfg?.params.colors);
  const emaColors = parsePeriodColors(emaCfg?.params.colors);
  const bbColors = parsePeriodColors(bbCfg?.params.colors);

  const smaVis = useMemo(
    () => getIndicatorOverlayVisibility("sma", smaPeriods),
    [smaPeriods.join(","), refreshTick],
  );
  const emaVis = useMemo(
    () => getIndicatorOverlayVisibility("ema", emaPeriods),
    [emaPeriods.join(","), refreshTick],
  );
  const bbVis = useMemo(() => getBbOverlayVisibility(), [refreshTick]);
  const bbStratVis = useMemo(
    () => getBbStrategyVisibility(),
    [refreshTick],
  );
  const patternVis = useMemo(
    () => getChartPatternVisibility(),
    [refreshTick],
  );
  const classicalPatternVis = useMemo(
    () => getClassicalChartPatternVisibility(),
    [refreshTick],
  );
  const swingVis = useMemo(() => getSwingChartVisibility(), [refreshTick]);
  const srVis = useMemo(() => getSrChartVisibility(), [refreshTick]);
  const volumeVis = useMemo(() => isVolumeOverlayVisible(), [refreshTick]);
  const fibVis = useMemo(() => getFibLevelVisibility(), [refreshTick]);
  const fibExtraVis = useMemo(() => getFibExtraVisibility(), [refreshTick]);
  const auxVis = useMemo(() => getAuxIndicatorVisibility(), [refreshTick]);
  const fibDraw = useMemo(() => isFibDrawMode(), [refreshTick]);
  const fibRet = useMemo(() => getFibRetracement(), [refreshTick]);
  const fibPending = useMemo(() => getFibPendingLow(), [refreshTick]);
  const tlVis = useMemo(() => getTrendlineChartVisibility(), [refreshTick]);
  const tlKindColors = useMemo(
    () => getTrendlineKindColors(),
    [refreshTick],
  );
  const ascendingLines = trendlines?.ascending ?? EMPTY_TRENDLINES;
  const descendingLines = trendlines?.descending ?? EMPTY_TRENDLINES;
  const allTrendlineIdsKey = [
    ...ascendingLines.map((l) => l.id),
    ...descendingLines.map((l) => l.id),
  ].join("|");
  const tlLineVis = useMemo(
    () =>
      getTrendlineLineVisibility(
        allTrendlineIdsKey ? allTrendlineIdsKey.split("|") : [],
      ),
    [allTrendlineIdsKey, refreshTick],
  );
  const tlLineColors = useMemo(
    () =>
      getTrendlineLineColors([...ascendingLines, ...descendingLines]),
    [allTrendlineIdsKey, refreshTick],
  );

  const bump = (fn: () => void) => {
    fn();
    onVisibilityChange();
  };

  const toggleOpen = (key: SidebarOpenKey) =>
    setOpen(toggleSidebarOpenKey(key));

  const setCollapsedPersisted = (next: boolean) => {
    setChartSidebarCollapsed(next);
    setCollapsed(next);
  };

  const kindLineState = (kind: TrendlineChartToggleId, lines: Trendline[]) => {
    if (lines.length <= 1) {
      return groupState([tlVis[kind]]);
    }
    if (!tlVis[kind]) {
      return { checked: false, indeterminate: false };
    }
    return groupState(lines.map((l) => tlLineVis[l.id] ?? false));
  };

  const setKindVisible = (
    kind: TrendlineChartToggleId,
    lines: Trendline[],
    next: boolean,
  ) => {
    setTrendlineChartVisible(kind, next);
    if (lines.length > 1) {
      setTrendlineLinesVisible(
        lines.map((l) => l.id),
        next,
      );
    }
  };

  const smaVals = smaPeriods.map((p) => smaVis[p]);
  const emaVals = emaPeriods.map((p) => emaVis[p]);
  const bbVals = BB_BAND_ORDER.map((band) => bbVis[band]);
  const bbStratVals = BB_STRATEGY_ORDER.map((id) => bbStratVis[id]);
  const maVals = [...smaVals, ...emaVals];
  const maState = groupState(maVals);
  const smaState = groupState(smaVals);
  const emaState = groupState(emaVals);
  const bbBandState = groupState(bbVals);
  const bbStratState = groupState(bbStratVals);
  const bbState = groupState([...bbVals, ...bbStratVals]);
  const swingState = groupState(SWING_CHART_TOGGLE_ORDER.map((id) => swingVis[id]));
  const srState = groupState(SR_CHART_TOGGLE_ORDER.map((id) => srVis[id]));
  const patternState = groupState(
    CANDLE_PATTERN_ORDER.map((id) => patternVis[id]),
  );
  const classicalPatternState = groupState(
    CHART_PATTERN_ORDER.map((id) => classicalPatternVis[id]),
  );
  const fibLevelState = groupState(
    FIB_RETRACEMENT_LEVELS.map((r) => fibVis[r]),
  );
  const fibExtraState = groupState(
    FIB_EXTRA_ORDER.map((id) => fibExtraVis[id]),
  );
  const fibState = groupState([
    ...FIB_RETRACEMENT_LEVELS.map((r) => fibVis[r]),
    ...FIB_EXTRA_ORDER.map((id) => fibExtraVis[id]),
  ]);
  const auxState = groupState(AUX_INDICATOR_ORDER.map((id) => auxVis[id]));
  const ascState = kindLineState("ascending", ascendingLines);
  const descState = kindLineState("descending", descendingLines);
  const tlAggregateVals: boolean[] = [];
  for (const kind of TRENDLINE_CHART_TOGGLE_ORDER) {
    const lines = kind === "ascending" ? ascendingLines : descendingLines;
    if (lines.length > 1) {
      if (!tlVis[kind]) {
        tlAggregateVals.push(false);
      } else {
        for (const line of lines) {
          tlAggregateVals.push(tlLineVis[line.id] ?? false);
        }
      }
    } else {
      tlAggregateVals.push(tlVis[kind]);
    }
  }
  const tlState = groupState(tlAggregateVals);

  if (collapsed) {
    // Slim in-flow rail — keeps the chart full-height and avoids covering candles.
    return (
      <aside
        className="flex w-full shrink-0 flex-row gap-1.5 lg:sticky lg:top-4 lg:w-11 lg:flex-col"
        aria-label="접힌 차트 사이드바"
      >
        <button
          type="button"
          className="flex flex-1 items-center justify-center rounded-lg border border-border bg-surface px-2 py-2 text-[11px] font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary lg:flex-none lg:px-1.5 lg:py-3 lg:[writing-mode:vertical-rl] lg:tracking-wide"
          onClick={() => setCollapsedPersisted(false)}
          title="차트 레이어 펼치기"
        >
          레이어
        </button>
        {onOpenIndicatorConfig && (
          <button
            type="button"
            className="flex flex-1 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-2 py-2 text-[11px] font-medium text-accent hover:bg-accent/20 lg:flex-none lg:px-1.5 lg:py-3 lg:[writing-mode:vertical-rl] lg:tracking-wide"
            onClick={onOpenIndicatorConfig}
            title="기술 지표 설정"
          >
            지표
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={clsx(
        "w-full shrink-0 rounded-xl border border-border bg-surface text-left lg:sticky lg:top-4 lg:w-64",
        className,
      )}
    >
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary">차트 레이어</p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              켜고 끄기 · 지표 기간/색은 「지표 설정」
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-tertiary hover:border-accent/40 hover:text-text-primary"
            onClick={() => setCollapsedPersisted(true)}
            title="사이드바 접기"
          >
            접기
          </button>
        </div>
        {onOpenIndicatorConfig && (
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-accent/40 bg-accent/10 px-2 py-1.5 text-left text-xs font-medium text-accent hover:bg-accent/20"
            onClick={onOpenIndicatorConfig}
          >
            기술 지표 설정…
          </button>
        )}
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

        {bbCfg?.enabled !== false && (
          <Group
            title="볼린저 밴드"
            open={open.bb}
            onToggleOpen={() => toggleOpen("bb")}
            checked={bbState.checked}
            indeterminate={bbState.indeterminate}
            onToggleAll={(next) =>
              bump(() => {
                setBbOverlayGroupVisible(next);
                setBbStrategyGroupVisible(next);
              })
            }
          >
            <Group
              title="밴드"
              open={open.bbBands}
              onToggleOpen={() => toggleOpen("bbBands")}
              checked={bbBandState.checked}
              indeterminate={bbBandState.indeterminate}
              onToggleAll={(next) =>
                bump(() => setBbOverlayGroupVisible(next))
              }
            >
              {BB_BAND_ORDER.map((band: BbBandId) => (
                <Leaf
                  key={band}
                  label={`BB ${BB_BAND_META[band].labelKo}`}
                  hint={BB_BAND_META[band].label}
                  color={resolveBbBandColor(bbColors, band)}
                  checked={bbVis[band]}
                  onChange={(next) =>
                    bump(() => setBbOverlayVisible(band, next))
                  }
                />
              ))}
            </Group>

            <Group
              title="전략"
              open={open.bbStrategies}
              onToggleOpen={() => toggleOpen("bbStrategies")}
              checked={bbStratState.checked}
              indeterminate={bbStratState.indeterminate}
              onToggleAll={(next) =>
                bump(() => setBbStrategyGroupVisible(next))
              }
            >
              {BB_STRATEGY_ORDER.map((id: BbStrategyId) => (
                <Leaf
                  key={id}
                  label={BB_STRATEGY_META[id].labelKo}
                  hint={BB_STRATEGY_META[id].description}
                  checked={bbStratVis[id]}
                  onChange={(next) =>
                    bump(() => setBbStrategyVisible(id, next))
                  }
                />
              ))}
            </Group>
          </Group>
        )}

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
              setKindVisible("ascending", ascendingLines, next);
              setKindVisible("descending", descendingLines, next);
            })
          }
        >
          {TRENDLINE_CHART_TOGGLE_ORDER.map((id: TrendlineChartToggleId) => {
            const lines =
              id === "ascending" ? ascendingLines : descendingLines;
            const kindColor = tlKindColors[id];
            const openKey = id === "ascending" ? "tlAscending" : "tlDescending";
            const state = id === "ascending" ? ascState : descState;

            if (lines.length > 1) {
              return (
                <Group
                  key={id}
                  title={TRENDLINE_CHART_TOGGLE_META[id].labelKo}
                  open={open[openKey]}
                  onToggleOpen={() => toggleOpen(openKey)}
                  checked={state.checked}
                  indeterminate={state.indeterminate}
                  colorDot={kindColor}
                  onToggleAll={(next) =>
                    bump(() => setKindVisible(id, lines, next))
                  }
                >
                  <div className="mb-1 px-1.5">
                    <p className="mb-1 text-[10px] text-text-tertiary">
                      기본 색상
                    </p>
                    <ColorSwatchPicker
                      value={kindColor}
                      options={TRENDLINE_COLOR_OPTIONS}
                      size="sm"
                      onChange={(c) =>
                        bump(() => setTrendlineKindColor(id, c))
                      }
                    />
                  </div>
                  {lines.map((line, i) => {
                    const lineColor = tlLineColors[line.id] ?? kindColor;
                    return (
                      <Leaf
                        key={line.id}
                        label={trendlineLeafLabel(line, i)}
                        hint={trendlineLeafHint(line)}
                        color={lineColor}
                        checked={
                          tlVis[id] && (tlLineVis[line.id] ?? false)
                        }
                        colorValue={lineColor}
                        colorOptions={TRENDLINE_COLOR_OPTIONS}
                        onColorChange={(c) =>
                          bump(() => setTrendlineLineColor(line.id, c))
                        }
                        onChange={(next) =>
                          bump(() => {
                            if (next && !tlVis[id]) {
                              setTrendlineChartVisible(id, true);
                            }
                            setTrendlineLineVisible(line.id, next);
                          })
                        }
                      />
                    );
                  })}
                </Group>
              );
            }

            const singleColor =
              lines[0] != null
                ? (tlLineColors[lines[0].id] ?? kindColor)
                : kindColor;

            return (
              <Leaf
                key={id}
                label={TRENDLINE_CHART_TOGGLE_META[id].labelKo}
                hint={TRENDLINE_CHART_TOGGLE_META[id].description}
                color={singleColor}
                checked={tlVis[id]}
                colorValue={singleColor}
                colorOptions={TRENDLINE_COLOR_OPTIONS}
                onColorChange={(c) =>
                  bump(() => {
                    setTrendlineKindColor(id, c);
                    if (lines[0]) setTrendlineLineColor(lines[0].id, c);
                  })
                }
                onChange={(next) =>
                  bump(() => setTrendlineChartVisible(id, next))
                }
              />
            );
          })}
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
            onToggleAll={(next) =>
              bump(() => {
                setAllFibLevelsVisible(next);
                setAllFibExtrasVisible(next);
              })
            }
          >
            <Group
              title="되돌림 레벨"
              open={open.fibLevels}
              onToggleOpen={() => toggleOpen("fibLevels")}
              checked={fibLevelState.checked}
              indeterminate={fibLevelState.indeterminate}
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
            </Group>
            <Group
              title="차트 표현"
              open={open.fibExtras}
              onToggleOpen={() => toggleOpen("fibExtras")}
              checked={fibExtraState.checked}
              indeterminate={fibExtraState.indeterminate}
              onToggleAll={(next) => bump(() => setAllFibExtrasVisible(next))}
            >
              {FIB_EXTRA_ORDER.map((id: FibExtraId) => (
                <Leaf
                  key={id}
                  label={FIB_EXTRA_META[id].labelKo}
                  hint={FIB_EXTRA_META[id].description}
                  checked={fibExtraVis[id]}
                  onChange={(next) =>
                    bump(() => setFibExtraVisible(id, next))
                  }
                />
              ))}
            </Group>
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
                    setFibPendingLow(null);
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
                저점 클릭 후 고점 클릭. 가격 숫자는 차트 아래 범례에만
                표시됩니다.
              </p>
            </div>
          </Group>
        </div>

        <Group
          title="보조 지표 (패널)"
          open={open.aux}
          onToggleOpen={() => toggleOpen("aux")}
          checked={auxState.checked}
          indeterminate={auxState.indeterminate}
          onToggleAll={(next) => bump(() => setAuxIndicatorGroupVisible(next))}
        >
          {AUX_INDICATOR_ORDER.map((id: AuxIndicatorId) => (
            <Leaf
              key={id}
              label={AUX_INDICATOR_META[id].labelKo}
              hint={AUX_INDICATOR_META[id].description}
              checked={auxVis[id]}
              onChange={(next) =>
                bump(() => setAuxIndicatorVisible(id, next))
              }
            />
          ))}
        </Group>

        <Group
          title="차트 패턴"
          open={open.classicalPatterns}
          onToggleOpen={() => toggleOpen("classicalPatterns")}
          checked={classicalPatternState.checked}
          indeterminate={classicalPatternState.indeterminate}
          onToggleAll={(next) =>
            bump(() => setClassicalChartPatternGroupVisible(next))
          }
        >
          {CHART_PATTERN_ORDER.map((id: ChartPatternId) => (
            <Leaf
              key={id}
              label={CHART_PATTERN_META[id].labelKo}
              hint={CHART_PATTERN_META[id].description}
              color={CHART_PATTERN_META[id].color}
              checked={classicalPatternVis[id]}
              onChange={(next) =>
                bump(() => setClassicalChartPatternVisible(id, next))
              }
            />
          ))}
        </Group>

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
