## 1. Risk rules loader: stop_method / atr_period / atr_multiple

- [ ] 1.1 Add fixtures under `test/fixtures/risk-rules/`: valid ATR config
      (`stop_method: atr` + valid `atr_period`/`atr_multiple`), unrecognized
      `stop_method` value, atr mode missing `atr_period`, atr mode missing
      `atr_multiple`, non-positive-integer `atr_period`, non-positive
      `atr_multiple`, and a no-stop-method-fields-present fixture (asserts
      default `channel` behavior).
- [ ] 1.2 Extend `src/risk/loadRiskRules.js`: read `stop_method` (default
      `'channel'` when absent), validate `atr_period`/`atr_multiple` only
      when `stop_method === 'atr'`, return the new fields alongside the
      existing three.
- [ ] 1.3 Add/extend tests in `test/loadRiskRules.test.js` covering every
      new fixture from 1.1 plus the existing `max_risk_per_trade <= 0.1`
      ceiling still enforced when `stop_method` is `atr`.
- [ ] 1.4 Run `node --test` and confirm all existing + new loader tests
      pass before moving on.

## 2. ATR calculation module

- [ ] 2.1 Create `backtest/atr.js` exporting `atrSeries(bars, atr_period)`:
      true range per bar, Wilder-smoothed, seeded with a simple mean of the
      first `atr_period` true-range values; indices before warm-up are
      `undefined`/not usable.
- [ ] 2.2 Add unit tests for `atr.js` against a small hand-computed OHLC
      fixture (verify both the seed value and at least two smoothed steps
      match a manually worked Wilder ATR calculation).

## 3. Wire ATR into the backtest

- [ ] 3.1 In `backtest/backtest.js`, precompute `atrSeries` per symbol
      (alongside `barsBySymbol`) when `rules.stop_method === 'atr'`.
- [ ] 3.2 Branch entry-time `stopLevel` computation on `rules.stop_method`:
      `channel` keeps `lowestClose(bars, i, exitLookback)`; `atr` uses
      `close - rules.atr_multiple * atrSeries[i]`.
- [ ] 3.3 Extend the entry warm-up guard so entries are skipped until both
      `entryLookback` and (in atr mode) `atr_period` bars of history exist.
- [ ] 3.4 Confirm the exit loop (channel-low trailing check + fixed
      `pos.stopLevel` check) needs no changes — both modes reuse it as-is;
      add a code comment noting the `channelLow >= stopLevel` invariant no
      longer holds in atr mode (label-only ambiguity, not an economics bug).
- [ ] 3.5 Extend `test/backtest.integration.test.js` with an atr-mode run
      (fixture rules + fixture bars) asserting entries use ATR-derived stop
      levels and that channel-mode behavior is byte-for-byte unchanged from
      before this change.

## 4. Max drawdown statistic

- [ ] 4.1 Update `backtest/stats.js`: change `summarize(trades)` to
      `summarize(trades, startEquity)`, compute a running equity curve from
      `startEquity` + cumulative `pnl` in trade order, and return
      `maxDrawdownPct` / `maxDrawdownUsd`.
- [ ] 4.2 Add tests for `summarize()` covering: empty trade list (drawdown
      zero), all-winning sequence (drawdown zero), and a sequence with a
      known peak-to-trough decline (assert the exact expected drawdown).
- [ ] 4.3 Update `backtest/run.js`'s call site to pass `config.startEquity`
      into `summarize()` and print `maxDrawdownPct`/`maxDrawdownUsd` in the
      console summary alongside the existing stats.

## 5. Sweep runner

- [ ] 5.1 Add a default `atr_multiple` sweep range to `backtest/config.js`
      (e.g. `sweep: { atrMultiples: [1.5, 2.0, 2.5, 3.0, 3.5] }`), kept
      separate from the single-run `atr_multiple` that lives in the risk
      rules file.
- [ ] 5.2 Create `backtest/sweep.js`: load risk rules first and fail closed
      (same pattern as `run.js`); if `rules.stop_method !== 'atr'`, print an
      error and exit non-zero without running any backtest.
- [ ] 5.3 For each configured `atr_multiple`, run the backtest with rules
      overridden to that multiple (`atr_period` and Donchian lookbacks
      untouched), collecting `summarize()` output per run.
- [ ] 5.4 Print a comparison table (multiple, trades, win rate, expectancy
      R, expectancy %, total P&L, max drawdown) and persist the full
      per-multiple result set as JSON under `backtest/results/`, following
      `run.js`'s existing timestamped-filename pattern.
- [ ] 5.5 Add `backtest/README.md` documentation for `node backtest/sweep.js`
      alongside the existing `run.js` docs, including the `stop_method: atr`
      precondition.

## 6. Final verification

- [ ] 6.1 Run `node --test` — full suite green.
- [ ] 6.2 Run `node backtest/run.js` against the live rules file (which
      already has `stop_method: atr`) and sanity-check the trade log/summary
      against the previous channel-mode results for plausibility (not
      identical — the stop source changed on purpose).
- [ ] 6.3 Run `node backtest/sweep.js` and confirm the comparison table and
      persisted JSON both look correct across the configured multiples.
