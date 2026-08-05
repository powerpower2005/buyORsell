# Agent notes

## Strategy & indicator docs

Local docs live under `docs/` (gitignored). Entry points:

1. `docs/indicators/INDEX.md` — indicator labels
2. `docs/strategies/INDEX.md` — strategy id → labels → doc → detector
3. `docs/strategies/{family}/{id}.md` — entry rules

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
| Detector, meta, entry rules, deps, playbook | `docs/strategies/CHANGELOG.md` | strategy id (`band_breakout`, …) |

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
