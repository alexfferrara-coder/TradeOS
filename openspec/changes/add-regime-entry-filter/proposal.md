## Why

The Donchian breakout takes every 20-day-high breakout regardless of the
broader trend. On the now-de-biased universe, expectancy is thin (0.256R at
`atr_multiple` 2.5) precisely because many breakouts fire inside downtrends —
BA, INTC, WBA, PYPL and others threw off breakouts while in sustained
declines, and those are disproportionately losers. A regime filter — only take
a long breakout when price is above its own long-term moving average — is the
classic, low-overfit way to skip those. This is the first strategy-level change
whose value can be honestly measured, now that the universe contains the losers
such a filter is supposed to avoid.

## What Changes

- Add a `smaClose(bars, i, period)` helper to `backtest/strategy.js` (trailing
  simple moving average of closes, same "prior N days" convention as
  `highestClose`/`lowestClose`).
- Add a regime entry filter to the entries path in `backtest/backtest.js`:
  when enabled, an otherwise-valid breakout entry is skipped if
  `close <= SMA(smaPeriod)`. Entry-only; exits are untouched.
- Add strategy config to `backtest/config.js`:
  `strategy.regimeFilter = { enabled: false, smaPeriod: 200 }`. Default
  `enabled: false` reproduces today's behavior exactly.
- Give `runBacktest` an optional third parameter,
  `runBacktest(barsBySymbol, rules, strategy = config.strategy)`, so the sweep
  can inject the filter settings per run (mirrors how `atr_multiple` is
  injected via a modified `rules` object).
- Add `backtest/regime-sweep.js`: runs a filter-off baseline plus one run per
  `config.sweep.regimeSmaPeriods` value (filter on), holding `atr_multiple`
  constant, and prints/persists a comparison table.
- Document the filter and the regime sweep in `backtest/README.md`.

## Capabilities

### New Capabilities
- `regime-entry-filter`: A trend-regime gate on entries (take a long breakout
  only when price is above its long-term SMA), switchable on/off, with a sweep
  over SMA horizons to measure its effect against a filter-off baseline.

### Modified Capabilities
(none — the Donchian entry/exit condition, the risk gate, the ATR stop, and
the existing `atr_multiple` sweep are all unchanged; the filter is an
additional, default-off gate)

## Impact

- `backtest/strategy.js` — new `smaClose` helper.
- `backtest/backtest.js` — optional `strategy` parameter; a default-off entry
  gate; warm-up guard extended so entries wait for `smaPeriod` bars when the
  filter is on.
- `backtest/config.js` — new `strategy.regimeFilter` block and
  `sweep.regimeSmaPeriods`.
- New `backtest/regime-sweep.js` entrypoint (loads rules first, fails closed,
  same pattern as `run.js`/`sweep.js`).
- `backtest/README.md` — filter + regime-sweep docs.
- Tests — new coverage for `smaClose`, for the filter gating an entry
  (on vs off), and for the default-off backward-compatibility guarantee.
- Out of scope: the stricter "SMA rising" variant, applying the filter to
  exits, changing the live risk-rules file or the `atr_multiple` value, and any
  UI. `atr_multiple` is held at its current 2.5 for the regime comparison so
  the filter's effect is isolated.
