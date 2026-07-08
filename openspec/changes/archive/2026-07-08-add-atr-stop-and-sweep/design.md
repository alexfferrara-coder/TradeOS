## Context

`backtest/strategy.js` fixes the Donchian 20/10 entry/exit. Today the "hard
stop" isn't independent risk math — it's just the entry-minus-channel-low
distance, so the trailing channel exit is always the binding exit and the
fixed stop is a no-op floor (documented in `backtest/README.md`). The live
risk-rules file (`~/Documents/Risk As./Risk Framework/My Risk Rules.md`)
already declares `stop_method: atr`, `atr_period: 14`, `atr_multiple: 2.5` in
its frontmatter — a real, separate stop distance derived from volatility —
but `loadRiskRules.js` doesn't read those fields and the backtest ignores
them. This change wires that up, and adds the ability to sweep
`atr_multiple` across a range so the "2.5 is a default, not truth" note in
the rules file becomes something you can actually test rather than a
comment.

Bars already carry `high`/`low`/`close` (see `backtest/alpaca.js`
normalization), so no new data source is needed for ATR.

## Goals / Non-Goals

**Goals:**
- Read and validate `stop_method` / `atr_period` / `atr_multiple` from the
  risk-rules frontmatter, defaulting `stop_method` to `channel` when absent
  so rules files without these fields behave exactly as today.
- Compute a standard Wilder ATR and use it as the risk-per-share (R) source
  when `stop_method: atr`, leaving the Donchian entry/exit condition and the
  channel-derived path both unchanged.
- Keep `gate.js`'s sizing formula stop-method-agnostic — it already just
  takes a `stopLevel` and computes `riskPerShare = entry - stopLevel`; no
  reason to touch it.
- Add a sweep runner that varies `atr_multiple` only (`atr_period` and the
  Donchian lookbacks held fixed) and reports a comparison table.
- Add max drawdown to `backtest/stats.js` so sweep results aren't judged on
  total P&L alone (which favors overfitting to the 2019–2024 window).

**Non-Goals:**
- Changing the Donchian 20/10 entry/exit condition itself.
- Any user-facing UI, settings panel, or "riskier" toggle.
- Futures/forex/other asset classes.
- Relaxing or making configurable the existing `max_risk_per_trade <= 0.1`
  ceiling in `loadRiskRules.js` — that stays a hard, non-negotiable rail.
- Sweeping `atr_period` — only `atr_multiple` is swept in this change,
  consistent with the earlier decision to keep the sweep scope small.

## Decisions

**ATR formula: Wilder's smoothed ATR, not a simple moving average of true
range.** The rules file's own comment ("period 14 (standard = 14)") points at
the conventional definition. True range per bar =
`max(high-low, |high-prevClose|, |low-prevClose|)`; seed ATR as the simple
mean of the first `atr_period` true-range values, then smooth:
`ATR[t] = (ATR[t-1] * (period-1) + TR[t]) / period`. Alternative considered:
plain SMA of true range — simpler, but not what "standard ATR" means, and
would silently diverge from what the rules file's author expects.

**Precompute a full ATR series per symbol, not per-bar on demand.** Wilder
smoothing is sequential/stateful — computing `ATR` at index `i` correctly
requires having walked from the start of the series. `strategy.js`'s
`highestClose`/`lowestClose` can be recomputed cheaply per call because
they're a small fixed-window scan; ATR can't be without either recomputing
from bar 0 every time (O(n) per lookup, O(n²) overall) or precomputing once.
Decision: compute `atrSeries(bars, atr_period)` once per symbol (O(n)),
alongside `barsBySymbol`, and pass it into `runBacktest` the same way bars
are passed in today.

**`gate.js` stays untouched; `backtest.js` branches on `stop_method` only at
entry-time stop-level computation.** `sizePosition()` already treats
`stopLevel` as an opaque input and derives `riskPerShare` from
`entry - stopLevel` — that logic doesn't care where `stopLevel` came from.
So the only new branch lives in `backtest.js`, at the point where an entry
is accepted: `channel` mode keeps computing
`stopLevel = lowestClose(bars, i, exitLookback)` (unchanged); `atr` mode
computes `stopLevel = close - (rules.atr_multiple * atrSeries[i])` instead.
Everything downstream — sizing, the exit loop, trade logging — is unchanged
code path, not a parallel implementation.

**Exit-reason invariant changes, exit economics don't.** Today's exit loop
assumes `channelLow >= stopLevel` always (documented in `backtest.js`), so
`hitChannel` implies the channel is the binding/reported exit. In `atr` mode
that inequality isn't guaranteed — an ATR stop can sit above or below the
channel low depending on volatility. Both exits are still evaluated on the
same day's `close`, so the exit *price* is identical either way; only the
`reason` label (`channel` vs `hard-stop`) can become ambiguous when both
trip the same day. Decision: keep the existing `hitChannel ? 'channel' :
'hard-stop'` precedence for both modes rather than adding tie-break logic —
document it as a known label-only ambiguity (see Risks) rather than solve it
now.

**No upper bound on `atr_multiple`.** `max_risk_per_trade` keeps its hard
10% ceiling (a dollar-risk rail), but `atr_multiple` only changes trade
*character* (stop distance, share count) at constant dollar risk — capping
it would be exactly the "constrict the system" the proposal is meant to
avoid. `loadRiskRules.js` validates `atr_multiple > 0` and nothing above
that. `gate.js`'s existing `shares < 1` rejection is enough of a backstop
against a nonsensical multiple silently doing something dangerous.

**Sweep requires `stop_method: atr` in the loaded rules.** Sweeping
`atr_multiple` when the active rules file says `channel` would silently test
a parameter that isn't in effect. The sweep runner fails fast with a clear
error rather than running channel-mode backtests N times.

**`summarize()` takes `startEquity` as a new required parameter.** Max
drawdown needs a reference equity curve, not just the trade list. Trades are
already pushed in exit-chronological order by `runBacktest`'s date-sorted
loop, so reconstructing a running-equity curve from `startEquity + cumsum(pnl)`
is enough to compute peak-to-trough drawdown without adding a separate
equity-tracking pass.

## Risks / Trade-offs

- **[Risk] Exit-reason mislabeling when ATR stop and channel trip the same
  day.** → Mitigation: documented as label-only; `pnl`/`retPct`/`rMultiple`
  are unaffected since the exit price is the same `close` either way.
- **[Risk] The rules file already has `stop_method: atr` live today.** As
  soon as this change lands, the *next* `node backtest/run.js` run switches
  from channel-derived to ATR-derived stops automatically — not a bug, but a
  real behavior change on first run, worth confirming before merging rather
  than discovering after.
- **[Risk] Wilder ATR needs `atr_period` warm-up bars before it's defined**,
  same shape as the existing `entryLookback` warm-up skip in `backtest.js`.
  → Mitigation: entries before `max(entryLookback, atr_period)` bars of
  history are skipped, same pattern as today's `i < entryLookback` guard.
- **[Trade-off] No sanity ceiling on `atr_period`/`atr_multiple` beyond
  "positive."** A typo'd `atr_period: 1400` wouldn't be rejected, just
  produce a very smoothed/late ATR. Left as an open question below rather
  than unilaterally deciding a bound.
- **[Trade-off] `summarize()`'s signature changes** (`startEquity` added) —
  both call sites (`run.js`, new `sweep.js`) must be updated together; no
  external consumers exist yet, so this isn't a breaking change to anything
  outside this repo.

## Migration Plan

1. `loadRiskRules.js` + fixtures + tests: add field reading/validation,
   default `stop_method: channel` when absent. Landable alone; no behavior
   change for callers not setting `stop_method`.
2. `backtest/atr.js` (new) + unit tests for the Wilder calculation.
3. `backtest/backtest.js` + `gate.js` wiring: branch stop-level computation
   on `rules.stop_method`; extend integration tests to cover `atr` mode.
4. `backtest/stats.js`: add `maxDrawdownPct`/`maxDrawdownUsd`; update
   `run.js`'s call site to pass `startEquity`.
5. `backtest/sweep.js` (new): iterate `atr_multiple` values, reuse
   `runBacktest` + `summarize`, print comparison table, persist JSON.

Each step is independently revertable. Rollback for the whole change is
"delete the new fields from the rules frontmatter" (loader defaults back to
`channel`) plus `git revert`, since nothing here touches the entry/exit
strategy itself.

## Open Questions

- Should `atr_period` (and/or `atr_multiple`) get a sanity upper bound in
  validation to catch typos, the way `max_risk_per_trade` has a hard 10%
  ceiling? Currently proposed as unbounded-above, validated only as
  positive.
- Default sweep range: hardcode a default list of `atr_multiple` values in
  `config.js` (e.g. `[1.5, 2.0, 2.5, 3.0, 3.5]`) with CLI override, or
  require the range as a CLI argument every run? Leaning toward a config
  default with optional override, matching how `config.js` already holds
  other backtest parameters.
