## 1. SMA helper

- [ ] 1.1 Add `smaClose(bars, i, period)` to `backtest/strategy.js` — mean of
      closes over `[i-period, i-1]` (prior N days, today excluded), matching
      the `highestClose`/`lowestClose` convention.
- [ ] 1.2 Add unit tests for `smaClose` against a small hand-computed series
      (verify the window boundaries and the excluded-today convention).

## 2. Config

- [ ] 2.1 Add `strategy: { regimeFilter: { enabled: false, smaPeriod: 200 } }`
      to `backtest/config.js`, and add `regimeSmaPeriods: [50, 100, 150, 200]`
      to the existing `sweep` block.

## 3. Wire the filter into the backtest

- [ ] 3.1 Change `runBacktest(barsBySymbol, rules)` to
      `runBacktest(barsBySymbol, rules, strategy = config.strategy)`.
- [ ] 3.2 In the entries loop, when `strategy.regimeFilter.enabled`, skip an
      otherwise-valid breakout when `close <= smaClose(bars, i, smaPeriod)`.
- [ ] 3.3 Extend the entry warm-up guard so that, when the filter is enabled,
      entries are skipped until `i >= smaPeriod`.
- [ ] 3.4 Extend `test/backtest.integration.test.js`: a filter-on case where a
      below-SMA breakout is skipped and an above-SMA breakout is taken, and a
      case asserting filter-off (default, two-arg call) is identical to the
      pre-change trades.
- [ ] 3.5 Run `node --test` and confirm all existing + new tests pass.

## 4. Regime sweep

- [ ] 4.1 Create `backtest/regime-sweep.js`: load rules first and fail closed
      (same pattern as `run.js`/`sweep.js`); run a filter-off baseline plus one
      run per `config.sweep.regimeSmaPeriods` value with the filter on, holding
      `atr_multiple` constant.
- [ ] 4.2 Print a comparison table (config label, trades, win rate, expectancy
      R, expectancy %, total P&L, max drawdown) and persist the full result set
      as JSON under `backtest/results/` following the existing filename
      pattern.
- [ ] 4.3 Document the regime filter and `node backtest/regime-sweep.js` in
      `backtest/README.md`.

## 5. Verification

- [ ] 5.1 Run `node --test` — full suite green.
- [ ] 5.2 Run `node backtest/regime-sweep.js` and record the filter-off vs
      per-SMA comparison; note whether the filter improves expectancy/drawdown
      or is net cost (this is the decision input for whether to adopt it).
