# Agent notes

## Strategy & indicator docs

Local docs live under `docs/`. `versions.md` and both changelogs are tracked; other generated docs are gitignored. Entry points:

1. `docs/indicators/INDEX.md` — indicator labels
2. `docs/indicators/candle_patterns/` — candlestick patterns (not a strategy family)
3. `docs/strategies/INDEX.md` — strategy id → labels → doc → detector
4. `docs/strategies/COMPANIONS.md` — confirm layers (같이 켤 지표)
5. `docs/strategies/{family}/{id}.md` — entry rules

Regenerate indexes/docs (does **not** overwrite changelogs):

```bash
node scripts/gen-strategy-docs.mjs
```

Cursor rule: `.cursor/rules/strategy-docs.mdc` (always applied).

## Changelog (required)

Whenever you change **indicators** or **strategies**, append to the matching changelog in the **same task**. Do not skip this.

| Touched | Append to | Name each |
|---------|-----------|-----------|
| Indicator impl, label, params, series, catalog | `docs/indicators/CHANGELOG.md` | label id (`rsi`, `bb`, …) |
| Candle pattern meta / confirm | `docs/indicators/CHANGELOG.md` | `candle_patterns` / pattern id |
| Detector, meta, entry rules, deps, playbook, companions | `docs/strategies/CHANGELOG.md` | strategy id (`band_breakout`, …) |

### How to write

1. Prepend (or extend) today's `## YYYY-MM-DD` section at the top (newest first).
2. One bullet per changed id.
3. State **what** changed; add **why** when non-obvious.

Example:

```markdown
## 2026-08-06

- **`bb`**: squeeze bandwidth threshold 0.05 → 0.08
- **`band_breakout`** (`bb`): require close outside band (was high/low touch)
```

Skip only pure mechanical refactors with no behavior, label, or rule change.

`gen-strategy-docs.mjs` creates missing `CHANGELOG.md` files once and never regenerates their content.


## Per-item versions

- Before changing an indicator, state signal, strategy, candle or chart pattern, check its entry in `config/analysis-versions.json`.
- A change to values, event conditions, availability time or execution semantics requires a major version. Additive options preserving defaults use minor; presentation-only corrections use patch.
- Record the affected IDs, previous behavior, current behavior and verification in `docs/versions.md` and the appropriate changelog.
- Keep the first-observation replay in the normal evaluation path. Chart geometry may retain original pivot coordinates; entry events must use confirmation time.
- Run `npm run test:evaluation` and `npm run build` after evaluation changes.
- `docs/versions.md` and both changelogs are tracked. Other generated documents remain local.

## Quote collection and recovery

- GOOGLEFINANCE bar requests must own a fresh temporary worksheet; do not reuse a shared scratch cell or rely on workflow concurrency groups for spreadsheet isolation. Clean up only an acknowledged, owned worksheet.
- Validate request date bounds, unique ordered dates, finite values and OHLC bounds before merge. Do not silently accept partially malformed provider tables.
- On refresh, request the entire retained history and require coverage of stored dates in that range. A recent-only refresh can mix pre/post-split price bases. Never locally infer split scaling or volume corrections from a ratio alone.
- A normal merge is additive, not proof that absent dates should be deleted. Historical removal needs explicit evidence, before/after hashes and regenerated aggregates. Preserve fetchedAt for local repairs; a repair is not a new provider fetch.
- Collection/recovery versions and behavior are in `config/collection-versions.json` and `docs/collection.md`. Do not bump indicator/strategy versions for unchanged formulas after source data repair.
- Run `npm run test:collection`, `npm run test:stale-refresh` and `npm run validate-data` for collection changes. The SOXX read-only provider check uses Actions secrets and never commits data or prints credentials.
- Collection v3 requires the exact requested exchange, cross-symbol fingerprints and independent Yahoo price/date verification. Do not silently accept alternate exchanges, skip verification on network failure, or convert a failed quality check into an empty backfill chunk.
- `config/collection-integrity.json` contains evidence-backed, exact-value provider corrections, anchored missing-session additions, reviewed genuine price moves and official non-trading dates. A changed raw snapshot/basis must fail for renewed review; never expand an exception just to make CI green. Preserve source-specific volume conventions and document any explicit corporate-action conversion.
- Quarantined files are immutable evidence in `data-quarantine/`, outside the published data index. CI validates every active daily series, derived timeframe and index; the data push helper repeats validation after merging remote catalog changes.
- Universe recovery details and provider limitations live in `docs/data-audit.md`. Changing source data does not change the unchanged indicator or signal formulas/versions. Consumers must baseline only affected series and retain existing tracking snapshots.

- Collection v3.1 no longer permits an unverified 1% reference gap. For invalid/missing Korean Yahoo reference bars, use identified Naver history and require every collected bar to have a valid independent reference; otherwise stop. Keep the supplemental domestic audit and per-series recovery lineage.

- Scheduled batches must audit each active daily series once even if the latest bar is fresh, regenerate derived timeframes, and report exact added/revised dates. Missing daily files require a same-instrument committed baseline to retain recovery lineage. If any series fails, report all failures and do not publish any data from that batch. Never fill a calendar day without verified provider evidence.

- Full-history batch operational results use only SLACK_LOG_CHANNEL_ID for verified/persisted success and SLACK_ERROR_CHANNEL_ID for failures, never investment channels. Keep docs/slack/batch-collection.md, its README index and collection module versions in sync. Include KST detection time, stage, safe cause, trading reference date, source tags and run URL. Do not relay raw errors or retry ambiguous Slack POSTs. A failed send must remain visible as an Actions failure.
