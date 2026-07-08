## Why

The risk-rules file (`~/Documents/Risk As./Risk Framework/My Risk Rules.md`) already
declares `stop_method`, `atr_period`, and `atr_multiple` in its frontmatter, but
`loadRiskRules.js` and the backtest gate ignore them — the backtest still derives
risk-per-share (R) from the 10-day exit channel, making the "hard stop" redundant
with the channel exit. Wiring up ATR-derived stops is the next deliberate step in
de-risking the strategy (per the risk-rules file's own notes on `atr_multiple`
drifting 2x→2.5x and being "a backtest parameter to be swept, not truth"), and is
a prerequisite for later strategy iteration and a user-facing risk toggle.

## What Changes

- `loadRiskRules.js` reads and validates `stop_method` (`atr` | `channel`),
  `atr_period` (positive integer), and `atr_multiple` (positive number) from the
  frontmatter, defaulting `stop_method` to `channel` when absent so existing
  rules files without these fields keep today's behavior unchanged.
- Add an ATR calculation (Wilder's average true range over `atr_period` bars) as
  a new module, used only when `stop_method: atr`.
- `gate.js` / `backtest.js` select risk-per-share (R) from the ATR calculation
  when `stop_method: atr`, or the existing channel-derived distance when
  `stop_method: channel` — the entry/exit Donchian 20/10 condition itself is
  unchanged either way.
- Add a sweep runner that executes the backtest across a range of
  `atr_multiple` values (`atr_period` and the Donchian lookbacks held fixed)
  and prints/writes a comparison table per multiple.
- Add max drawdown to `backtest/stats.js` so sweep results can be judged on
  more than raw total P&L.
- `max_risk_per_trade`'s existing `<= 0.1` ceiling in `loadRiskRules.js` is
  **unchanged** — this change does not touch it, add a way to configure past
  it, or relax it for any stop method.

## Capabilities

### New Capabilities
- `atr-stop-loss`: Loading, validating, and applying an ATR-derived stop-loss
  distance as an alternative to the existing channel-derived stop, selected by
  the risk-rules file's `stop_method` field.
- `backtest-parameter-sweep`: Running the backtest across a range of
  `atr_multiple` values and reporting a comparison (trades, win rate,
  expectancy R/%, total P&L, max drawdown) per value.

### Modified Capabilities
(none — no existing `openspec/specs/` capabilities predate this change)

## Impact

- `src/risk/loadRiskRules.js` — new optional fields, new validation branches,
  backward-compatible default (`channel`) when fields are absent.
- `backtest/gate.js`, `backtest/backtest.js` — R-source becomes conditional on
  `stop_method`; both paths must produce the same `{ accepted, shares,
  riskPerShare, stopLevel }` shape so `backtest.js`'s exit logic (channel vs.
  hard-stop comparison) keeps working unmodified.
- `backtest/stats.js` — add max drawdown to `summarize()`.
- New: an ATR calculation module and a sweep entrypoint (e.g.
  `backtest/sweep.js`), following the existing `run.js` pattern of loading
  rules first and failing closed.
- Test fixtures under `test/fixtures/risk-rules/` — new fixtures for
  `stop_method`/`atr_period`/`atr_multiple` validation (valid ATR config,
  invalid `stop_method` value, non-integer `atr_period`, non-positive
  `atr_multiple`, and the no-fields-present backward-compatibility case).
- Out of scope: changing the Donchian 20/10 entry/exit rule, any user-facing
  UI or "riskier" toggle, multi-asset-class support, and relaxing the
  `max_risk_per_trade` ceiling — all deferred to later changes.
