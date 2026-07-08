## Why

The regime entry filter was introduced default-off so it could be measured
before adoption. The regime sweep on the honest 16-symbol universe showed it
earns its keep at long horizons: SMA 200 lifts win rate 48%→52% and expectancy
0.256R→0.352R (+37%) at flat drawdown, and a follow-up `atr_multiple` sweep
*with the filter on* confirmed 2.0 as the best-all-around multiple ($22.3k P&L,
0.429R, 4.82% max drawdown). Based on that evidence, the strategy adopts the
filter as its default.

## What Changes

- Flip `config.strategy.regimeFilter` to `{ enabled: true, smaPeriod: 200 }`,
  so `run.js` and the sweeps use the filter by default.
- Pin the filter OFF explicitly in the integration tests that exercise
  filter-independent behavior (Donchian and ATR cases), so those tests assert
  against their own inputs rather than the config default.
- **BREAKING (default behavior):** `runBacktest`'s default strategy (from
  `config.strategy`) now applies the regime filter. Callers who want the old
  behavior must pass an explicit filter-off strategy. The disabled-filter
  behavior itself is unchanged and still reproduces pre-filter results exactly.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `regime-entry-filter`: the default changes from disabled to enabled at a
  200-day SMA; the backward-compatibility guarantee (disabling reproduces
  pre-filter behavior) is retained.

## Impact

- `backtest/config.js` — `strategy.regimeFilter.enabled` false → true.
- `test/backtest.integration.test.js` — Donchian/ATR tests pin filter-off
  explicitly; the obsolete "default is off" assertion is replaced by an
  explicit "disabling reproduces prior behavior" test plus an assertion that
  the shipped config now has the filter enabled.
- Not included: the `atr_multiple` value lives in the personal risk-rules
  file, not this repo; changing it 2.5 → 2.0 is a user decision on that file,
  tracked separately from this change.
