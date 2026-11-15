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
