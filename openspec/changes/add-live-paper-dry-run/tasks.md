## 1. Extract shared decision logic

- [x] 1.1 Create `backtest/decide.js` with `decideExit({ bars, i, position,
      config })` (channel + hard-stop check → `{ exit, reason }`) and
      `decideEntry({ bars, i, equity, openCount, rules, strategy, config })`
      (warm-ups, breakout, regime filter, sizing → accepted decision or skip
      reason), lifted from `backtest.js` with identical logic.
- [x] 1.2 Rewire `backtest/backtest.js` to call `decideExit`/`decideEntry`
      instead of its inline checks, preserving the exits-then-entries phasing.
- [x] 1.3 Run `node --test` and confirm all 43 existing tests pass unchanged
      (exact-trade + no-look-ahead assertions are the refactor guardrail).
- [x] 1.4 Add direct unit tests for `decideEntry`/`decideExit` covering a
      breakout taken, a below-SMA breakout filtered, and an exit trigger.

## 2. Alpaca paper broker (read-only)

- [x] 2.1 Create `backtest/broker.js` exporting a factory that returns
      `{ getAccount, getPositions, getRecentBars }` — account/positions via
      `paper-api.alpaca.markets`, `getRecentBars` fetching ~250 recent bars up
      to the latest session with `adjustment=all` (uncached). Fetch is injected
      so it can be faked in tests.
- [x] 2.2 Unit-test `broker.js` with a fake fetch (assert paper endpoint,
      headers, and bar normalization).

## 3. Local strategy-state store

- [x] 3.1 Create `backtest/state.js`: load/save a gitignored JSON map of
      symbol → `{ stopLevel, riskPerShare, entryDate }`, with a reconcile
      helper that flags broker positions lacking local state.
- [x] 3.2 Unit-test `state.js` load/save/reconcile against temp files.
- [x] 3.3 Add the state file path to `.gitignore`.

## 4. Live dry-run entrypoint

- [x] 4.1 Create `backtest/live.js`: load rules first and fail closed; take an
      injected broker; select the last completed daily bar (warn if market
      open); run `decideExit` for held symbols and `decideEntry` for flat
      symbols; print and persist a per-symbol decisions report. No
      order-submission code.
- [x] 4.2 Test `live.js` orchestration with a mock broker: a flat account
      (entry-only report) and a seeded-position account (exit/hold report),
      asserting nothing is ever submitted.

## 5. Docs and verification

- [x] 5.1 Document `node backtest/live.js` in `backtest/README.md` — dry-run,
      paper-only, no-submit, decides on the last completed bar.
- [x] 5.2 Run `node --test` — full suite green.
- [x] 5.3 Run `node backtest/live.js` against the live paper account and
      confirm it prints a sane decisions report and writes the JSON, submitting
      nothing.
