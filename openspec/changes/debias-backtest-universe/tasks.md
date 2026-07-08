## 1. Expand the universe

- [ ] 1.1 Add `BA, INTC, WBA, PYPL, NFLX, DIS, F, META, ROKU, T, NKE` to
      `config.symbols` in `backtest/config.js` (5 → 16), leaving the existing
      five entries in place.

## 2. Documentation

- [ ] 2.1 Update the survivorship-bias note in `backtest/README.md` to
      describe the de-biased 16-symbol universe, the failure-mode spread, the
      expected heavier correlation-cap rejection, and the remaining ceiling
      (no truly delisted names).

## 3. Fetch and verify

- [ ] 3.1 Run `node backtest/run.js` and confirm all 16 symbols fetch with
      plausible daily-bar counts (watch the per-symbol bar-count lines) and
      the run completes without error. Confirm the originally configured
      symbols' behavior is unchanged (same trade count/dates for SPY, AAPL,
      MSFT, NVDA, JPM as before, allowing for portfolio-slot contention from
      the new symbols).
- [ ] 3.2 Run `node backtest/sweep.js` and record the honest `atr_multiple`
      comparison table across the expanded universe. Do NOT change the
      `atr_multiple` in the risk-rules file — the decision stays deferred.

## 4. Regression check

- [ ] 4.1 Run `node --test` — full suite still green (no logic changed, but
      confirm nothing regressed).
