## 1. Adopt the filter

- [x] 1.1 Set `config.strategy.regimeFilter` to `{ enabled: true, smaPeriod:
      200 }` in `backtest/config.js`, with a comment citing the sweep evidence.

## 2. Insulate tests from the config default

- [x] 2.1 In `test/backtest.integration.test.js`, add a shared filter-off
      strategy and pass it explicitly to the Donchian and ATR tests (which test
      filter-independent behavior).
- [x] 2.2 Replace the obsolete "default is off" test with (a) an explicit
      "disabling reproduces prior behavior" test and (b) an assertion that the
      shipped `config.strategy` now has the filter enabled at SMA 200.

## 3. Verify

- [x] 3.1 Run `node --test` — full suite green with the filter adopted.
