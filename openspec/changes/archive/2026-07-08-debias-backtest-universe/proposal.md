## Why

The backtest universe is five known winners (`SPY, AAPL, MSFT, NVDA, JPM`) —
survivorship-biased by construction, as `backtest/README.md` already flags.
That was fine for validating plumbing (the ATR stop work), but it is not fine
for the next step. The planned regime entry filter's entire job is to keep the
strategy *out of* losing trades; on a universe with no real losers, such a
filter can only ever show cost (skipped entries) and never its benefit (dodged
downtrends). Before any loss-avoidance logic can be honestly measured, the
universe must contain instruments that actually fell.

## What Changes

- Expand `config.symbols` from 5 to 16 by adding `BA, INTC, WBA, PYPL, NFLX,
  DIS, F, META, ROKU, T, NKE` — names spread deliberately across failure
  modes (idiosyncratic disaster, secular decline, value trap, growth crashes
  that stayed down, growth crashes that recovered, and a choppy cyclical) so
  the eventual regime filter must prove itself against several kinds of loss,
  not one.
- Re-run the existing `atr_multiple` sweep on the expanded universe to produce
  the first non-survivorship-biased read of the strategy, and use *that* to
  inform the still-deferred `atr_multiple` decision.
- No changes to `runBacktest`, the risk gate, the ATR path, or the sweep
  logic — they simply operate over more symbols. Existing cached bars are
  untouched; only the 11 new symbols are fetched.

## Capabilities

### New Capabilities
- `backtest-universe`: The composition of the backtest symbol universe and the
  requirement that it be de-biased — i.e. include instruments with documented
  sustained drawdowns — so loss-avoidance logic can be evaluated on both its
  cost and its benefit.

### Modified Capabilities
(none — `atr-stop-loss` and `backtest-parameter-sweep` behavior is unchanged;
they just run over more symbols)

## Impact

- `backtest/config.js` — `symbols` array grows from 5 to 16.
- `backtest/data/` — 11 new cached bar files fetched on first run (gitignored).
- `backtest/README.md` — update the "survivorship-biased" note to describe the
  de-biased universe, the failure-mode spread, and the remaining ceiling.
- Expected behavioral effect (not a bug): with 16 symbols competing for
  `max_correlated_positions: 2` concurrent slots, the flat portfolio-wide
  correlation cap rejects far more entries than it did at 5 symbols. This is
  the gate working as designed; sector-grouped correlation modeling remains a
  later change.
- Out of scope: the regime entry filter (a separate later change), any
  correlation-model rework, locking in an `atr_multiple` value, per-symbol
  statistics, and adding truly delisted names (no data available from Alpaca).
