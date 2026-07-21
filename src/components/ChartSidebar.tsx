import { useMemo, useState } from "react";
import clsx from "clsx";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { HelpTip } from "@/components/HelpTip";
import { getIndicatorConfig } from "@/lib/configStore";
import type { IndicatorConfigSectionId } from "@/components/IndicatorConfigForm";
import {
  auxHelp,
  bbStrategyHelp,
  candlePatternHelp,
  CHART_LAYER_HELP,
  classicalPatternHelp,
  fibExtraHelp,
  fibLevelHelp,
  srHelp,
  swingHelp,
  trendlineKindHelp,
} from "@/lib/chartLayerHelp";
import { patternStrategyHelp } from "@/lib/patternStrategyHelp";
import {
  PATTERN_STRATEGY_META,
  PATTERN_STRATEGY_ORDER,
  type PatternStrategyId,
} from "@/lib/patternStrategyMeta";
import {
  getPatternStrategyVisibility,
  setPatternStrategyGroupVisible,
  setPatternStrategyVisible,
} from "@/lib/patternStrategyStore";
import { rsiStrategyHelp } from "@/lib/rsiStrategyHelp";
import {
  RSI_STRATEGY_META,
  RSI_STRATEGY_ORDER,
  type RsiStrategyId,
} from "@/lib/rsiStrategyMeta";
import {
  getRsiStrategyVisibility,
  setRsiStrategyGroupVisible,
  setRsiStrategyVisible,
} from "@/lib/rsiStrategyStore";
import { volumeStrategyHelp } from "@/lib/volumeStrategyHelp";
import {
  VOLUME_STRATEGY_META,
  VOLUME_STRATEGY_ORDER,
  type VolumeStrategyId,
} from "@/lib/volumeStrategyMeta";
import {
  getVolumeStrategyVisibility,
  setVolumeStrategyGroupVisible,
  setVolumeStrategyVisible,
} from "@/lib/volumeStrategyStore";
import { macdStrategyHelp } from "@/lib/macdStrategyHelp";
import {
  MACD_STRATEGY_META,
  MACD_STRATEGY_ORDER,
  type MacdStrategyId,
} from "@/lib/macdStrategyMeta";
import {
  getMacdStrategyVisibility,
  setMacdStrategyGroupVisible,
  setMacdStrategyVisible,
} from "@/lib/macdStrategyStore";
import { stochStrategyHelp } from "@/lib/stochStrategyHelp";
import {
  STOCH_STRATEGY_META,
  STOCH_STRATEGY_ORDER,
  type StochStrategyId,
} from "@/lib/stochStrategyMeta";
import {
  getStochStrategyVisibility,
  setStochStrategyGroupVisible,
  setStochStrategyVisible,
} from "@/lib/stochStrategyStore";
import type { HelpContent } from "@/lib/indicatorHelp";
import { INDICATOR_HELP } from "@/lib/indicatorHelp";
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
  getIchimokuOverlayVisibility,
  getIndicatorOverlayVisibility,
  isVolumeOverlayVisible,
  setBbOverlayGroupVisible,
  setBbOverlayVisible,
  setIchimokuOverlayGroupVisible,
  setIchimokuOverlayVisible,
  setIndicatorOverlayGroupVisible,
  setIndicatorOverlayVisible,
  setVolumeOverlayVisible,
} from "@/lib/indicatorOverlayStore";
import {
  ICHIMOKU_PART_META,
  ICHIMOKU_PART_ORDER,
  resolveIchimokuColor,
  type IchimokuPartId,
} from "@/lib/ichimokuOverlay";
import { ichimokuStrategyHelp } from "@/lib/ichimokuStrategyHelp";
import {
  ICHIMOKU_STRATEGY_META,
  ICHIMOKU_STRATEGY_ORDER,
  type IchimokuStrategyId,
} from "@/lib/ichimokuStrategyMeta";
import {
  getIchimokuStrategyVisibility,
  setIchimokuStrategyGroupVisible,
  setIchimokuStrategyVisible,
} from "@/lib/ichimokuStrategyStore";
import {
  CANDLE_PATTERN_BIAS_ORDER,
  CANDLE_PATTERN_META,
  CANDLE_PATTERN_ORDER,
  candlePatternsByBias,
} from "@/lib/candlePatternMeta";
import {
  CHART_PATTERN_BIAS_ORDER,
  CHART_PATTERN_META,
  CHART_PATTERN_ORDER,
  chartPatternsByBias,
  type ChartPatternId,
} from "@/lib/chartPatternMeta";
import { PATTERN_BIAS_META, type PatternBias } from "@/lib/patternBias";
import {
  getChartPatternVisibility,
  setChartPatternVisible,
} from "@/lib/candlePatternStore";
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
  getTrendlineAlgoVersion,
  getTrendlineChartVisibility,
  getTrendlineKindColors,
  getTrendlineLineColors,
  getTrendlineLineVisibility,
  setTrendlineAlgoVersion,
  setTrendlineChartVisible,
  setTrendlineKindColor,
  setTrendlineLineColor,
  setTrendlineLineVisible,
  setTrendlineLinesVisible,
  TRENDLINE_ALGO_META,
  TRENDLINE_ALGO_ORDER,
  type TrendlineAlgoVersion,
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
import {
  formatSignalRate,
  signalRateTitle,
  type SignalStat,
  type SignalStatsBundle,
} from "@/lib/evaluation/signalFollowThrough";
import {
  filterStrategyCatalog,
  getCatalogStrategyHelp,
  getCatalogStrategyStat,
  getCatalogStrategyVisibility,
  setAllCatalogStrategiesVisible,
  setCatalogFamilyVisible,
  setCatalogStrategyVisible,
  strategiesByFamily,
  STRATEGY_CATALOG,
  STRATEGY_FAMILY_META,
  type StrategyFamilyId,
} from "@/lib/strategyCatalog";

const EMPTY_TRENDLINES: Trendline[] = [];

interface Props {
  /** Bumps when any visibility store changes (parent tick). */
  visibilityTick: number;
  /** Also bump when indicator config (periods/colors) changes. */
  configTick?: number;
  onVisibilityChange: () => void;
  /** Bump parent evaluation when algo/settings that affect compute change. */
  onConfigChange?: () => void;
  /** Open indicator editor for a chart-layer group / leaf. */
  onEditIndicator?: (section: IndicatorConfigSectionId) => void;
  /** Current evaluation trendlines for per-line toggles. */
  trendlines?: TrendlineResult | null;
  /** Follow-through % for patterns/strategies on this ticker. */
  signalStats?: SignalStatsBundle | null;
  className?: string;
}

function rateClass(stat: SignalStat | undefined): string {
  if (!stat || stat.ratePct == null) return "text-text-tertiary";
  if (stat.ratePct >= 55) return "text-positive";
  if (stat.ratePct >= 40) return "text-accent";
  return "text-negative";
}

function trendlineLeafLabel(line: Trendline, index: number): string {
  const arrow = line.kind === "ascending" ? "↑" : "↓";
  return `${arrow} #${index + 1} · 터치 ${line.touches} · 점수 ${line.score}`;
}

function trendlineLeafHint(line: Trendline): string {
  const base = line.broken ? "이탈됨" : `${line.date1} → ${line.date2}`;
  return line.summary.includes("V2") ? `${base} · V2` : base;
}

/** Unified visibility control for every chart layer row. */
function OnOffSwitch({
  on,
  partial,
  onChange,
  label,
}: {
  on: boolean;
  /** Some children on — switch looks mixed; click turns all off. */
  partial?: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  const isPartial = Boolean(partial) && !on;
  const active = on || isPartial;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPartial ? "mixed" : on}
      aria-label={label ?? (on ? "켜짐" : "꺼짐")}
      title={isPartial ? "일부 켜짐 · 클릭하면 모두 끔" : on ? "켜짐" : "꺼짐"}
      className={clsx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        on
          ? "border-accent/50 bg-accent"
          : isPartial
            ? "border-accent/40 bg-accent/40"
            : "border-border bg-bg",
      )}
      onClick={(e) => {
        e.stopPropagation();
        // Partial → off; on → off; off → on.
        onChange(!(on || isPartial));
      }}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-[left]",
          active ? "left-[18px]" : "left-0.5",
        )}
      />
      <span className="sr-only">{on ? "ON" : isPartial ? "일부" : "OFF"}</span>
    </button>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/10"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      Edit
    </button>
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
  onEdit,
  help,
  /** Nested groups skip the outer border so nesting stays clean. */
  nested,
}: {
  title: string;
  open: boolean;
  onToggleOpen: () => void;
  checked: boolean;
  indeterminate?: boolean;
  onToggleAll: (next: boolean) => void;
  children: React.ReactNode;
  colorDot?: string;
  onEdit?: () => void;
  help?: HelpContent;
  nested?: boolean;
}) {
  return (
    <div className={clsx(!nested && "border-b border-border last:border-b-0")}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-medium text-text-primary"
          onClick={onToggleOpen}
        >
          <span className="w-3 shrink-0 text-text-tertiary">
            {open ? "▾" : "▸"}
          </span>
          {colorDot && (
            <span
              className="inline-block h-1.5 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: colorDot }}
            />
          )}
          <span className="truncate">{title}</span>
        </button>
        <OnOffSwitch
          on={checked}
          partial={indeterminate}
          onChange={onToggleAll}
          label={`${title} 표시`}
        />
        {help && <HelpTip help={help} />}
        {onEdit && <EditLink onClick={onEdit} />}
      </div>
      {open && (
        <div
          className={clsx(
            "space-y-0.5 pb-2 pr-2",
            nested ? "pl-3" : "pl-5",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function BiasBadge({ bias }: { bias: PatternBias }) {
  const meta = PATTERN_BIAS_META[bias];
  return (
    <span
      className={clsx(
        "shrink-0 rounded border px-1 py-px text-[10px] font-medium leading-none",
        meta.className,
      )}
    >
      {meta.shortKo}
    </span>
  );
}

function Leaf({
  label,
  checked,
  onChange,
  color,
  hint,
  bias,
  rateStat,
  colorValue,
  onColorChange,
  colorOptions,
  onEdit,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  color?: string;
  hint?: string;
  bias?: PatternBias;
  /** Historical follow-through on this ticker (pattern/strategy). */
  rateStat?: SignalStat;
  colorValue?: string;
  onColorChange?: (color: string) => void;
  colorOptions?: readonly string[];
  onEdit?: () => void;
  help?: HelpContent;
}) {
  const rateText = formatSignalRate(rateStat);
  const rateTitle = signalRateTitle(rateStat);
  return (
    <div className="rounded px-1.5 py-1 hover:bg-surface-elevated/60">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            {color && (
              <span
                className="inline-block h-0.5 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
              />
            )}
            <span className="truncate">{label}</span>
            {bias && <BiasBadge bias={bias} />}
            {rateStat != null && (
              <span
                className={clsx(
                  "shrink-0 tabular-nums text-[10px] font-semibold",
                  rateClass(rateStat),
                )}
                title={rateTitle}
              >
                {rateText ?? "—"}
              </span>
            )}
          </div>
          {hint && (
            <p className="mt-0.5 text-[10px] leading-snug text-text-tertiary">
              {hint}
            </p>
          )}
        </div>
        <OnOffSwitch
          on={checked}
          onChange={onChange}
          label={`${label} 표시`}
        />
        {help && <HelpTip help={help} />}
        {onEdit && <EditLink onClick={onEdit} />}
      </div>
      {colorValue && onColorChange && (
        <div className="mt-1.5">
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
  onConfigChange,
  onEditIndicator,
  trendlines,
  signalStats,
  className,
}: Props) {
  const [open, setOpen] = useState<SidebarOpenState>(() => getSidebarOpenState());
  const [collapsed, setCollapsed] = useState(() => isChartSidebarCollapsed());
  const [strategyQuery, setStrategyQuery] = useState("");
  const refreshTick = visibilityTick + configTick;
  const stats = signalStats ?? null;
  const tlAlgo = useMemo(() => getTrendlineAlgoVersion(), [refreshTick]);
  const catalogVis = useMemo(
    () => getCatalogStrategyVisibility(),
    [refreshTick],
  );
  const filteredCatalog = useMemo(
    () => filterStrategyCatalog(strategyQuery),
    [strategyQuery],
  );
  const catalogGroups = useMemo(
    () => strategiesByFamily(filteredCatalog),
    [filteredCatalog],
  );
  const catalogSearching = strategyQuery.trim().length > 0;

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
  const ichiCfg = useMemo(() => getIndicatorConfig("ichimoku"), [refreshTick]);
  const ichiColors = parsePeriodColors(ichiCfg?.params.colors);
  const ichiVis = useMemo(() => getIchimokuOverlayVisibility(), [refreshTick]);
  const ichiStratVis = useMemo(
    () => getIchimokuStrategyVisibility(),
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
  const patternStratVis = useMemo(
    () => getPatternStrategyVisibility(),
    [refreshTick],
  );
  const rsiStratVis = useMemo(
    () => getRsiStrategyVisibility(),
    [refreshTick],
  );
  const volumeStratVis = useMemo(
    () => getVolumeStrategyVisibility(),
    [refreshTick],
  );
  const macdStratVis = useMemo(
    () => getMacdStrategyVisibility(),
    [refreshTick],
  );
  const stochStratVis = useMemo(
    () => getStochStrategyVisibility(),
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
    if (lines.length > 0) {
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
  const allCatalogVals = STRATEGY_CATALOG.map(
    (entry) => catalogVis[entry.family][entry.id] ?? false,
  );
  const allCatalogState = groupState(allCatalogVals);
  const familyCatalogState = (family: StrategyFamilyId) =>
    groupState(
      (catalogGroups.find((g) => g.family === family)?.entries ?? []).map(
        (entry) => catalogVis[entry.family][entry.id] ?? false,
      ),
    );
  const maVals = [...smaVals, ...emaVals];
  const maState = groupState(maVals);
  const smaState = groupState(smaVals);
  const emaState = groupState(emaVals);
  const bbBandState = groupState(bbVals);
  const bbStratState = groupState(bbStratVals);
  // Parent BB checkbox follows bands only (strategies stay in their subgroup).
  const bbState = bbBandState;
  const ichiPartVals = ICHIMOKU_PART_ORDER.map((id) => ichiVis[id]);
  const ichiStratVals = ICHIMOKU_STRATEGY_ORDER.map((id) => ichiStratVis[id]);
  const ichiPartState = groupState(ichiPartVals);
  const ichiStratState = groupState(ichiStratVals);
  const ichiRootState = groupState([...ichiPartVals, ...ichiStratVals]);
  const swingState = groupState(SWING_CHART_TOGGLE_ORDER.map((id) => swingVis[id]));
  const srState = groupState(SR_CHART_TOGGLE_ORDER.map((id) => srVis[id]));
  const patternState = groupState(
    CANDLE_PATTERN_ORDER.map((id) => patternVis[id]),
  );
  const classicalPatternState = groupState(
    CHART_PATTERN_ORDER.map((id) => classicalPatternVis[id]),
  );
  const patternStratState = groupState(
    PATTERN_STRATEGY_ORDER.map((id) => patternStratVis[id]),
  );
  const rsiStratVals = RSI_STRATEGY_ORDER.map((id) => rsiStratVis[id]);
  const rsiStratState = groupState(rsiStratVals);
  const rsiRootState = groupState([auxVis.rsi, ...rsiStratVals]);
  const volumeStratVals = VOLUME_STRATEGY_ORDER.map((id) => volumeStratVis[id]);
  const volumeStratState = groupState(volumeStratVals);
  const volumeRootState = groupState([volumeVis, ...volumeStratVals]);
  const macdStratVals = MACD_STRATEGY_ORDER.map((id) => macdStratVis[id]);
  const macdStratState = groupState(macdStratVals);
  const macdRootState = groupState([auxVis.macd, ...macdStratVals]);
  const stochStratVals = STOCH_STRATEGY_ORDER.map((id) => stochStratVis[id]);
  const stochStratState = groupState(stochStratVals);
  const stochRootState = groupState([auxVis.stoch, ...stochStratVals]);
  const auxOtherIds = AUX_INDICATOR_ORDER.filter(
    (id) => id !== "rsi" && id !== "macd" && id !== "stoch",
  );
  const auxOtherState = groupState(auxOtherIds.map((id) => auxVis[id]));
  const classicalRootState = groupState([
    ...CHART_PATTERN_ORDER.map((id) => classicalPatternVis[id]),
    ...PATTERN_STRATEGY_ORDER.map((id) => patternStratVis[id]),
  ]);
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
  // RSI / MACD / Stoch live in their own top-level groups; aux is the rest.
  const auxState = auxOtherState;
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
        {onEditIndicator && (
          <button
            type="button"
            className="flex flex-1 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-2 py-2 text-[11px] font-medium text-accent hover:bg-accent/20 lg:flex-none lg:px-1.5 lg:py-3 lg:[writing-mode:vertical-rl] lg:tracking-wide"
            onClick={() => onEditIndicator("all")}
            title="지표 편집"
          >
            Edit
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={clsx(
        // Match chart column height on desktop (parent uses items-stretch);
        // scroll only the layer list so header stays pinned.
        "flex w-full shrink-0 flex-col rounded-xl border border-border bg-surface text-left",
        // Mobile: capped height. Desktop: stretch to the chart column height.
        "max-h-[min(70vh,640px)] lg:h-full lg:max-h-none lg:min-h-0 lg:self-stretch",
        "lg:sticky lg:top-4 lg:w-64",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary">차트 레이어</p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              ON/OFF = 표시 · Edit = 기간·색상
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Group
          title={`전체 전략 (${STRATEGY_CATALOG.length})`}
          open={open.allStrategies || catalogSearching}
          onToggleOpen={() => toggleOpen("allStrategies")}
          checked={allCatalogState.checked}
          indeterminate={allCatalogState.indeterminate}
          help={CHART_LAYER_HELP.allStrategies}
          onToggleAll={(next) =>
            bump(() => setAllCatalogStrategiesVisible(next))
          }
        >
          <div className="px-1.5 pb-1.5">
            <input
              type="search"
              value={strategyQuery}
              onChange={(e) => {
                const next = e.target.value;
                setStrategyQuery(next);
                if (next.trim() && !open.allStrategies) {
                  setOpen(toggleSidebarOpenKey("allStrategies"));
                }
              }}
              placeholder="전략 검색…"
              aria-label="전략 검색"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent/50 focus:outline-none"
            />
            {catalogSearching && (
              <p className="mt-1 text-[10px] text-text-tertiary">
                {filteredCatalog.length}개 일치
              </p>
            )}
          </div>
          {catalogGroups.map(({ family, entries }) => {
            const familyMeta = STRATEGY_FAMILY_META[family];
            const familyState = familyCatalogState(family);
            const familyOpen =
              catalogSearching || open[familyMeta.catalogOpenKey];
            return (
              <Group
                key={family}
                nested
                title={`${familyMeta.labelKo} (${entries.length})`}
                open={familyOpen}
                onToggleOpen={() => toggleOpen(familyMeta.catalogOpenKey)}
                checked={familyState.checked}
                indeterminate={familyState.indeterminate}
                onToggleAll={(next) =>
                  bump(() => setCatalogFamilyVisible(family, next))
                }
              >
                {entries.map((entry) => (
                  <Leaf
                    key={`${entry.family}:${entry.id}`}
                    label={entry.labelKo}
                    checked={catalogVis[entry.family][entry.id] ?? false}
                    rateStat={getCatalogStrategyStat(
                      entry.family,
                      entry.id,
                      stats,
                    )}
                    help={getCatalogStrategyHelp(entry.family, entry.id)}
                    onChange={(next) =>
                      bump(() =>
                        setCatalogStrategyVisible(
                          entry.family,
                          entry.id,
                          next,
                        ),
                      )
                    }
                  />
                ))}
              </Group>
            );
          })}
          {catalogGroups.length === 0 && (
            <p className="px-1.5 text-[10px] text-text-tertiary">
              검색 결과 없음
            </p>
          )}
        </Group>

        <Group
          title="이동평균"
          open={open.ma}
          onToggleOpen={() => toggleOpen("ma")}
          checked={maState.checked}
          indeterminate={maState.indeterminate}
          help={CHART_LAYER_HELP.ma}
          onEdit={
            onEditIndicator ? () => onEditIndicator("ma") : undefined
          }
          onToggleAll={(next) =>
            bump(() => {
              setIndicatorOverlayGroupVisible("sma", smaPeriods, next);
              setIndicatorOverlayGroupVisible("ema", emaPeriods, next);
            })
          }
        >
          <Group
            nested
            title="SMA"
            open={open.sma}
            onToggleOpen={() => toggleOpen("sma")}
            checked={smaState.checked}
            indeterminate={smaState.indeterminate}
            help={INDICATOR_HELP.sma}
            onEdit={
              onEditIndicator ? () => onEditIndicator("sma") : undefined
            }
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
            nested
            title="EMA"
            open={open.ema}
            onToggleOpen={() => toggleOpen("ema")}
            checked={emaState.checked}
            indeterminate={emaState.indeterminate}
            help={INDICATOR_HELP.ema}
            onEdit={
              onEditIndicator ? () => onEditIndicator("ema") : undefined
            }
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

        <Group
          title="볼린저 밴드"
          open={open.bb}
          onToggleOpen={() => toggleOpen("bb")}
          checked={bbState.checked}
          indeterminate={bbState.indeterminate}
          help={INDICATOR_HELP.bb}
          onEdit={onEditIndicator ? () => onEditIndicator("bb") : undefined}
          onToggleAll={(next) =>
            bump(() => setBbOverlayGroupVisible(next))
          }
        >
            <Group
              nested
              title="밴드"
              open={open.bbBands}
              onToggleOpen={() => toggleOpen("bbBands")}
              checked={bbBandState.checked}
              indeterminate={bbBandState.indeterminate}
              help={CHART_LAYER_HELP.bbBands}
              onToggleAll={(next) =>
                bump(() => setBbOverlayGroupVisible(next))
              }
            >
              {BB_BAND_ORDER.map((band: BbBandId) => (
                <Leaf
                  key={band}
                  label={`BB ${BB_BAND_META[band].labelKo}`}
                  color={resolveBbBandColor(bbColors, band)}
                  checked={bbVis[band]}
                  help={
                    band === "upper"
                      ? CHART_LAYER_HELP.bbUpper
                      : band === "middle"
                        ? CHART_LAYER_HELP.bbMiddle
                        : CHART_LAYER_HELP.bbLower
                  }
                  onChange={(next) =>
                    bump(() => setBbOverlayVisible(band, next))
                  }
                />
              ))}
            </Group>

            <Group
              nested
              title="전략"
              open={open.bbStrategies}
              onToggleOpen={() => toggleOpen("bbStrategies")}
              checked={bbStratState.checked}
              indeterminate={bbStratState.indeterminate}
              help={CHART_LAYER_HELP.bbStrategies}
              onToggleAll={(next) =>
                bump(() => setBbStrategyGroupVisible(next))
              }
            >
              {BB_STRATEGY_ORDER.map((id: BbStrategyId) => (
                <Leaf
                  key={id}
                  label={BB_STRATEGY_META[id].labelKo}
                  checked={bbStratVis[id]}
                  rateStat={
                    stats?.bbStrategy[id] ?? {
                      samples: 0,
                      wins: 0,
                      ratePct: null,
                    }
                  }
                  help={bbStrategyHelp(id)}
                  onChange={(next) =>
                    bump(() => setBbStrategyVisible(id, next))
                  }
                />
              ))}
            </Group>
        </Group>

        <Group
          title="일목균형표"
          open={open.ichimoku}
          onToggleOpen={() => toggleOpen("ichimoku")}
          checked={ichiRootState.checked}
          indeterminate={ichiRootState.indeterminate}
          help={CHART_LAYER_HELP.ichimoku}
          onEdit={
            onEditIndicator ? () => onEditIndicator("ichimoku") : undefined
          }
          onToggleAll={(next) =>
            bump(() => {
              setIchimokuOverlayGroupVisible(next);
              setIchimokuStrategyGroupVisible(next);
            })
          }
        >
          <Group
            nested
            title="구성 요소"
            open={open.ichimokuParts}
            onToggleOpen={() => toggleOpen("ichimokuParts")}
            checked={ichiPartState.checked}
            indeterminate={ichiPartState.indeterminate}
            help={CHART_LAYER_HELP.ichimokuParts}
            onToggleAll={(next) =>
              bump(() => setIchimokuOverlayGroupVisible(next))
            }
          >
            {ICHIMOKU_PART_ORDER.map((part: IchimokuPartId) => (
              <Leaf
                key={part}
                label={ICHIMOKU_PART_META[part].labelKo}
                color={
                  part === "cloud"
                    ? "#22c55e"
                    : resolveIchimokuColor(ichiColors, part)
                }
                checked={ichiVis[part]}
                help={
                  part === "cloud"
                    ? CHART_LAYER_HELP.ichimokuParts
                    : CHART_LAYER_HELP.ichimoku
                }
                onChange={(next) =>
                  bump(() => setIchimokuOverlayVisible(part, next))
                }
              />
            ))}
          </Group>
          <Group
            nested
            title="전략"
            open={open.ichimokuStrategies}
            onToggleOpen={() => toggleOpen("ichimokuStrategies")}
            checked={ichiStratState.checked}
            indeterminate={ichiStratState.indeterminate}
            help={CHART_LAYER_HELP.ichimokuStrategies}
            onToggleAll={(next) =>
              bump(() => setIchimokuStrategyGroupVisible(next))
            }
          >
            {ICHIMOKU_STRATEGY_ORDER.map((id: IchimokuStrategyId) => (
              <Leaf
                key={id}
                label={ICHIMOKU_STRATEGY_META[id].labelKo}
                checked={ichiStratVis[id]}
                rateStat={
                  stats?.ichimokuStrategy[id] ?? {
                    samples: 0,
                    wins: 0,
                    ratePct: null,
                  }
                }
                help={ichimokuStrategyHelp(id)}
                onChange={(next) =>
                  bump(() => setIchimokuStrategyVisible(id, next))
                }
              />
            ))}
          </Group>
        </Group>

        <Group
          title="거래량"
          open={open.volume}
          onToggleOpen={() => toggleOpen("volume")}
          checked={volumeRootState.checked}
          indeterminate={volumeRootState.indeterminate}
          help={CHART_LAYER_HELP.volume}
          onToggleAll={(next) =>
            bump(() => {
              setVolumeOverlayVisible(next);
              setVolumeStrategyGroupVisible(next);
            })
          }
        >
          <Leaf
            label="패널"
            checked={volumeVis}
            help={CHART_LAYER_HELP.volume}
            onChange={(next) => bump(() => setVolumeOverlayVisible(next))}
          />
          <Group
            nested
            title="전략"
            open={open.volumeStrategies}
            onToggleOpen={() => toggleOpen("volumeStrategies")}
            checked={volumeStratState.checked}
            indeterminate={volumeStratState.indeterminate}
            help={CHART_LAYER_HELP.volumeStrategies}
            onToggleAll={(next) =>
              bump(() => setVolumeStrategyGroupVisible(next))
            }
          >
            {VOLUME_STRATEGY_ORDER.map((id: VolumeStrategyId) => (
              <Leaf
                key={id}
                label={VOLUME_STRATEGY_META[id].labelKo}
                checked={volumeStratVis[id]}
                rateStat={
                  stats?.volumeStrategy[id] ?? {
                    samples: 0,
                    wins: 0,
                    ratePct: null,
                  }
                }
                help={volumeStrategyHelp(id)}
                onChange={(next) =>
                  bump(() => setVolumeStrategyVisible(id, next))
                }
              />
            ))}
          </Group>
        </Group>

        <Group
          title="스윙 구조"
          open={open.swing}
          onToggleOpen={() => toggleOpen("swing")}
          checked={swingState.checked}
          indeterminate={swingState.indeterminate}
          help={CHART_LAYER_HELP.swing}
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
              checked={swingVis[id]}
              help={swingHelp(id)}
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
          help={CHART_LAYER_HELP.trendlines}
          onToggleAll={(next) =>
            bump(() => {
              setKindVisible("ascending", ascendingLines, next);
              setKindVisible("descending", descendingLines, next);
            })
          }
        >
          <div className="mb-1.5 px-1.5">
            <p className="mb-1 text-[10px] font-medium text-text-tertiary">
              알고리즘
              {trendlines?.version ? ` · 현재 ${trendlines.version.toUpperCase()}` : ""}
            </p>
            <div className="flex gap-1">
              {TRENDLINE_ALGO_ORDER.map((ver: TrendlineAlgoVersion) => {
                const active = tlAlgo === ver;
                return (
                  <button
                    key={ver}
                    type="button"
                    title={TRENDLINE_ALGO_META[ver].description}
                    className={clsx(
                      "flex-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors",
                      active
                        ? "border-accent/60 bg-accent/15 text-accent"
                        : "border-border bg-bg text-text-tertiary hover:text-text-secondary",
                    )}
                    onClick={() => {
                      if (tlAlgo === ver) return;
                      setTrendlineAlgoVersion(ver);
                      onVisibilityChange();
                      onConfigChange?.();
                    }}
                  >
                    {TRENDLINE_ALGO_META[ver].labelKo}
                  </button>
                );
              })}
            </div>
          </div>
          {TRENDLINE_CHART_TOGGLE_ORDER.map((id: TrendlineChartToggleId) => {
            const lines =
              id === "ascending" ? ascendingLines : descendingLines;
            const kindColor = tlKindColors[id];
            const openKey = id === "ascending" ? "tlAscending" : "tlDescending";
            const state = id === "ascending" ? ascState : descState;

            if (lines.length > 1) {
              return (
                <Group
                  nested
                  key={id}
                  title={TRENDLINE_CHART_TOGGLE_META[id].labelKo}
                  open={open[openKey]}
                  onToggleOpen={() => toggleOpen(openKey)}
                  checked={state.checked}
                  indeterminate={state.indeterminate}
                  colorDot={kindColor}
                  help={trendlineKindHelp(id)}
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
                color={singleColor}
                checked={tlVis[id]}
                help={trendlineKindHelp(id)}
                colorValue={singleColor}
                colorOptions={TRENDLINE_COLOR_OPTIONS}
                onColorChange={(c) =>
                  bump(() => {
                    setTrendlineKindColor(id, c);
                    if (lines[0]) setTrendlineLineColor(lines[0].id, c);
                  })
                }
                onChange={(next) =>
                  bump(() => setKindVisible(id, lines, next))
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
          help={CHART_LAYER_HELP.sr}
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
              help={srHelp(id)}
              onChange={(next) => bump(() => setSrChartVisible(id, next))}
            />
          ))}
        </Group>

        <Group
          title="피보나치 되돌림"
          open={open.fib}
          onToggleOpen={() => toggleOpen("fib")}
          checked={fibState.checked}
          indeterminate={fibState.indeterminate}
          help={CHART_LAYER_HELP.fib}
          onToggleAll={(next) =>
            bump(() => {
              setAllFibLevelsVisible(next);
              setAllFibExtrasVisible(next);
            })
          }
        >
          <Group
            nested
            title="되돌림 레벨"
            open={open.fibLevels}
            onToggleOpen={() => toggleOpen("fibLevels")}
            checked={fibLevelState.checked}
            indeterminate={fibLevelState.indeterminate}
            help={CHART_LAYER_HELP.fibLevels}
            onToggleAll={(next) => bump(() => setAllFibLevelsVisible(next))}
          >
            {FIB_RETRACEMENT_LEVELS.map((ratio: FibLevelRatio) => (
              <Leaf
                key={ratio}
                label={fibLevelLabel(ratio)}
                color={FIB_LEVEL_COLORS[ratio]}
                checked={fibVis[ratio]}
                help={fibLevelHelp(ratio)}
                onChange={(next) =>
                  bump(() => setFibLevelVisible(ratio, next))
                }
              />
            ))}
          </Group>
          <Group
            nested
            title="차트 표현"
            open={open.fibExtras}
            onToggleOpen={() => toggleOpen("fibExtras")}
            checked={fibExtraState.checked}
            indeterminate={fibExtraState.indeterminate}
            help={CHART_LAYER_HELP.fibExtras}
            onToggleAll={(next) => bump(() => setAllFibExtrasVisible(next))}
          >
            {FIB_EXTRA_ORDER.map((id: FibExtraId) => (
              <Leaf
                key={id}
                label={FIB_EXTRA_META[id].labelKo}
                checked={fibExtraVis[id]}
                help={fibExtraHelp(id)}
                onChange={(next) =>
                  bump(() => setFibExtraVisible(id, next))
                }
              />
            ))}
          </Group>
          <Leaf
            label={
              fibDraw
                ? fibPending
                  ? "그리기 모드 · 고점 클릭"
                  : "그리기 모드 · 저점 클릭"
                : "차트에서 그리기"
            }
            hint="저점→고점 클릭. 가격은 차트 아래 범례에 표시됩니다."
            checked={fibDraw}
            onChange={(next) =>
              bump(() => {
                setFibDrawMode(next);
                setFibPendingLow(null);
              })
            }
          />
          {(fibRet || fibPending) && (
            <button
              type="button"
              className="mx-1.5 mt-0.5 w-[calc(100%-0.75rem)] rounded-md border border-border bg-bg px-2 py-1.5 text-left text-xs text-text-tertiary hover:text-negative"
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
        </Group>

        <Group
          title="RSI"
          open={open.rsi}
          onToggleOpen={() => toggleOpen("rsi")}
          checked={rsiRootState.checked}
          indeterminate={rsiRootState.indeterminate}
          help={INDICATOR_HELP.rsi}
          onEdit={
            onEditIndicator ? () => onEditIndicator("rsi") : undefined
          }
          onToggleAll={(next) =>
            bump(() => {
              setAuxIndicatorVisible("rsi", next);
              setRsiStrategyGroupVisible(next);
            })
          }
        >
          <Leaf
            label="패널"
            checked={auxVis.rsi}
            help={auxHelp("rsi")}
            onChange={(next) => bump(() => setAuxIndicatorVisible("rsi", next))}
            onEdit={
              onEditIndicator ? () => onEditIndicator("rsi") : undefined
            }
          />
          <Group
            nested
            title="전략"
            open={open.rsiStrategies}
            onToggleOpen={() => toggleOpen("rsiStrategies")}
            checked={rsiStratState.checked}
            indeterminate={rsiStratState.indeterminate}
            help={CHART_LAYER_HELP.rsiStrategies}
            onToggleAll={(next) =>
              bump(() => setRsiStrategyGroupVisible(next))
            }
          >
            {RSI_STRATEGY_ORDER.map((id: RsiStrategyId) => (
              <Leaf
                key={id}
                label={RSI_STRATEGY_META[id].labelKo}
                checked={rsiStratVis[id]}
                rateStat={
                  stats?.rsiStrategy[id] ?? {
                    samples: 0,
                    wins: 0,
                    ratePct: null,
                  }
                }
                help={rsiStrategyHelp(id)}
                onChange={(next) =>
                  bump(() => setRsiStrategyVisible(id, next))
                }
              />
            ))}
          </Group>
        </Group>

        <Group
          title="MACD"
          open={open.macd}
          onToggleOpen={() => toggleOpen("macd")}
          checked={macdRootState.checked}
          indeterminate={macdRootState.indeterminate}
          help={INDICATOR_HELP.macd}
          onEdit={
            onEditIndicator ? () => onEditIndicator("macd") : undefined
          }
          onToggleAll={(next) =>
            bump(() => {
              setAuxIndicatorVisible("macd", next);
              setMacdStrategyGroupVisible(next);
            })
          }
        >
          <Leaf
            label="패널"
            checked={auxVis.macd}
            help={auxHelp("macd")}
            onChange={(next) =>
              bump(() => setAuxIndicatorVisible("macd", next))
            }
            onEdit={
              onEditIndicator ? () => onEditIndicator("macd") : undefined
            }
          />
          <Group
            nested
            title="전략"
            open={open.macdStrategies}
            onToggleOpen={() => toggleOpen("macdStrategies")}
            checked={macdStratState.checked}
            indeterminate={macdStratState.indeterminate}
            help={CHART_LAYER_HELP.macdStrategies}
            onToggleAll={(next) =>
              bump(() => setMacdStrategyGroupVisible(next))
            }
          >
            {MACD_STRATEGY_ORDER.map((id: MacdStrategyId) => (
              <Leaf
                key={id}
                label={MACD_STRATEGY_META[id].labelKo}
                checked={macdStratVis[id]}
                rateStat={
                  stats?.macdStrategy[id] ?? {
                    samples: 0,
                    wins: 0,
                    ratePct: null,
                  }
                }
                help={macdStrategyHelp(id)}
                onChange={(next) =>
                  bump(() => setMacdStrategyVisible(id, next))
                }
              />
            ))}
          </Group>
        </Group>

        <Group
          title="스토캐스틱"
          open={open.stoch}
          onToggleOpen={() => toggleOpen("stoch")}
          checked={stochRootState.checked}
          indeterminate={stochRootState.indeterminate}
          help={INDICATOR_HELP.stoch}
          onEdit={
            onEditIndicator ? () => onEditIndicator("stoch") : undefined
          }
          onToggleAll={(next) =>
            bump(() => {
              setAuxIndicatorVisible("stoch", next);
              setStochStrategyGroupVisible(next);
            })
          }
        >
          <Leaf
            label="패널"
            checked={auxVis.stoch}
            help={auxHelp("stoch")}
            onChange={(next) =>
              bump(() => setAuxIndicatorVisible("stoch", next))
            }
            onEdit={
              onEditIndicator ? () => onEditIndicator("stoch") : undefined
            }
          />
          <Group
            nested
            title="전략"
            open={open.stochStrategies}
            onToggleOpen={() => toggleOpen("stochStrategies")}
            checked={stochStratState.checked}
            indeterminate={stochStratState.indeterminate}
            help={CHART_LAYER_HELP.stochStrategies}
            onToggleAll={(next) =>
              bump(() => setStochStrategyGroupVisible(next))
            }
          >
            {STOCH_STRATEGY_ORDER.map((id: StochStrategyId) => (
              <Leaf
                key={id}
                label={STOCH_STRATEGY_META[id].labelKo}
                checked={stochStratVis[id]}
                rateStat={
                  stats?.stochStrategy[id] ?? {
                    samples: 0,
                    wins: 0,
                    ratePct: null,
                  }
                }
                help={stochStrategyHelp(id)}
                onChange={(next) =>
                  bump(() => setStochStrategyVisible(id, next))
                }
              />
            ))}
          </Group>
        </Group>

        <Group
          title="보조 지표 (패널)"
          open={open.aux}
          onToggleOpen={() => toggleOpen("aux")}
          checked={auxState.checked}
          indeterminate={auxState.indeterminate}
          help={CHART_LAYER_HELP.aux}
          onToggleAll={(next) =>
            bump(() => {
              for (const id of auxOtherIds) {
                setAuxIndicatorVisible(id, next);
              }
            })
          }
        >
          {auxOtherIds.map((id: AuxIndicatorId) => {
            const editSection: IndicatorConfigSectionId | null =
              id === "bbPercentB"
                ? "bb"
                : id === "mfi" ||
                    id === "atr" ||
                    id === "obv" ||
                    id === "keltner" ||
                    id === "vwap" ||
                    id === "adx" ||
                    id === "psar" ||
                    id === "cci" ||
                    id === "supertrend"
                  ? id
                  : null;
            return (
              <Leaf
                key={id}
                label={AUX_INDICATOR_META[id].labelKo}
                checked={auxVis[id]}
                help={auxHelp(id)}
                onChange={(next) =>
                  bump(() => setAuxIndicatorVisible(id, next))
                }
                onEdit={
                  onEditIndicator && editSection
                    ? () => onEditIndicator(editSection)
                    : undefined
                }
              />
            );
          })}
        </Group>

        <Group
          title="차트 패턴"
          open={open.classicalPatterns}
          onToggleOpen={() => toggleOpen("classicalPatterns")}
          checked={classicalRootState.checked}
          indeterminate={classicalRootState.indeterminate}
          help={CHART_LAYER_HELP.classicalPatterns}
          onToggleAll={(next) =>
            bump(() => {
              setClassicalChartPatternGroupVisible(next);
              setPatternStrategyGroupVisible(next);
            })
          }
        >
          <Group
            nested
            title="패턴"
            open={open.classicalPatternShapes}
            onToggleOpen={() => toggleOpen("classicalPatternShapes")}
            checked={classicalPatternState.checked}
            indeterminate={classicalPatternState.indeterminate}
            help={CHART_LAYER_HELP.classicalPatterns}
            onToggleAll={(next) =>
              bump(() => setClassicalChartPatternGroupVisible(next))
            }
          >
            {CHART_PATTERN_BIAS_ORDER.map((bias) => {
              const ids = chartPatternsByBias(bias);
              if (!ids.length) return null;
              const openKey =
                bias === "bullish"
                  ? "classicalLong"
                  : bias === "bearish"
                    ? "classicalShort"
                    : "classicalBoth";
              const state = groupState(
                ids.map((id) => classicalPatternVis[id]),
              );
              return (
                <Group
                  nested
                  key={bias}
                  title={PATTERN_BIAS_META[bias].labelKo}
                  open={open[openKey]}
                  onToggleOpen={() => toggleOpen(openKey)}
                  checked={state.checked}
                  indeterminate={state.indeterminate}
                  onToggleAll={(next) =>
                    bump(() => {
                      for (const id of ids) {
                        setClassicalChartPatternVisible(id, next);
                      }
                    })
                  }
                >
                  {ids.map((id: ChartPatternId) => (
                    <Leaf
                      key={id}
                      label={CHART_PATTERN_META[id].labelKo}
                      color={CHART_PATTERN_META[id].color}
                      bias={bias}
                      checked={classicalPatternVis[id]}
                      rateStat={
                        stats?.chartPattern[id] ?? {
                          samples: 0,
                          wins: 0,
                          ratePct: null,
                        }
                      }
                      help={classicalPatternHelp(id)}
                      onChange={(next) =>
                        bump(() => setClassicalChartPatternVisible(id, next))
                      }
                    />
                  ))}
                </Group>
              );
            })}
          </Group>

          <Group
            nested
            title="전략"
            open={open.classicalPatternStrategies}
            onToggleOpen={() => toggleOpen("classicalPatternStrategies")}
            checked={patternStratState.checked}
            indeterminate={patternStratState.indeterminate}
            help={CHART_LAYER_HELP.patternStrategies}
            onToggleAll={(next) =>
              bump(() => setPatternStrategyGroupVisible(next))
            }
          >
            {PATTERN_STRATEGY_ORDER.map((id: PatternStrategyId) => (
              <Leaf
                key={id}
                label={PATTERN_STRATEGY_META[id].labelKo}
                checked={patternStratVis[id]}
                rateStat={
                  stats?.patternStrategy[id] ?? {
                    samples: 0,
                    wins: 0,
                    ratePct: null,
                  }
                }
                help={patternStrategyHelp(id)}
                onChange={(next) =>
                  bump(() => setPatternStrategyVisible(id, next))
                }
              />
            ))}
          </Group>
        </Group>

        <Group
          title="캔들 패턴"
          open={open.patterns}
          onToggleOpen={() => toggleOpen("patterns")}
          checked={patternState.checked}
          indeterminate={patternState.indeterminate}
          help={CHART_LAYER_HELP.candlePatterns}
          onToggleAll={(next) =>
            bump(() => {
              for (const id of CANDLE_PATTERN_ORDER) {
                setChartPatternVisible(id, next);
              }
            })
          }
        >
          {CANDLE_PATTERN_BIAS_ORDER.map((bias) => {
            const ids = candlePatternsByBias(bias);
            if (!ids.length) return null;
            const openKey =
              bias === "bullish"
                ? "candleLong"
                : bias === "bearish"
                  ? "candleShort"
                  : "candleNeutral";
            const state = groupState(ids.map((id) => patternVis[id]));
            return (
              <Group
                nested
                key={bias}
                title={PATTERN_BIAS_META[bias].labelKo}
                open={open[openKey]}
                onToggleOpen={() => toggleOpen(openKey)}
                checked={state.checked}
                indeterminate={state.indeterminate}
                onToggleAll={(next) =>
                  bump(() => {
                    for (const id of ids) {
                      setChartPatternVisible(id, next);
                    }
                  })
                }
              >
                {ids.map((id: CandlePatternId) => (
                  <Leaf
                    key={id}
                    label={CANDLE_PATTERN_META[id].labelKo}
                    bias={bias}
                    checked={patternVis[id]}
                    rateStat={
                      stats?.candlePattern[id] ?? {
                        samples: 0,
                        wins: 0,
                        ratePct: null,
                      }
                    }
                    help={candlePatternHelp(id)}
                    onChange={(next) =>
                      bump(() => setChartPatternVisible(id, next))
                    }
                  />
                ))}
              </Group>
            );
          })}
        </Group>
      </div>
    </aside>
  );
}
