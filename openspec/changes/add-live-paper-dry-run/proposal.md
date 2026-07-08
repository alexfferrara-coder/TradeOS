## Why

The strategy is validated in backtest (regime filter + ATR stop, measured on a
de-biased universe). The next step toward "live testing" is to run that exact
strategy against live market data and a real (paper) account, but the backtest
is a batch simulator — it can't answer "given my actual account state today,
what would I do?" This change adds a manual, dry-run live loop: it connects to
the Alpaca paper account, runs the strategy on the latest completed bar, and
reports the orders it *would* place — submitting nothing. It is the safe first
rung of forward testing, and its shared decision logic is the seam a future UI
will call to preview settings.

## What Changes

- Extract the per-day entry/exit decision logic out of `runBacktest` into a
  shared `backtest/decide.js` (`decideExit`, `decideEntry`). `runBacktest`
  calls these instead of inline logic; behavior is unchanged (existing tests
  are the guardrail). The live loop calls the same functions — one decision
  brain, two harnesses.
- Add `backtest/broker.js`: a read-only Alpaca paper adapter
  (`getAccount`, `getPositions`, `getRecentBars`), injectable so it can be
  mocked in tests. Account/positions use the paper endpoint; bars use the data
  API.
- Add `backtest/state.js`: a local, gitignored JSON store of per-position
  strategy state (`stopLevel`, `riskPerShare`, `entryDate`) the broker does not
  track, reconciled against actual positions.
- Add `backtest/live.js`: the manual dry-run entrypoint. Loads risk rules first
  and fails closed, decides on the last *completed* daily bar, prints and saves
  a "today's decisions" report, and **submits no orders**.

## Capabilities

### New Capabilities
- `paper-trading`: A manual, dry-run live loop that reads Alpaca paper account
  state, runs the strategy's shared decision logic on the latest completed bar,
  and reports intended orders without submitting them.

### Modified Capabilities
(none — the backtest's behavior is unchanged; extracting `decide.js` is an
internal refactor guarded by the existing tests)

## Impact

- `backtest/backtest.js` — inline entry/exit checks replaced by calls into the
  new `decide.js`; results must stay identical (existing integration tests
  enforce this).
- New `backtest/decide.js`, `backtest/broker.js`, `backtest/state.js`,
  `backtest/live.js`.
- `.gitignore` — add the local state store path.
- `backtest/README.md` — document `node backtest/live.js` and its dry-run,
  paper-only, no-submit guarantees.
- Tests — unit tests for `decideEntry`/`decideExit`, and a `live.js`
  orchestration test using a mock broker (no network).
- Out of scope (deliberate): submitting orders, any scheduling/automation,
  real-money/live-api trading, and the UI. The folder stays `backtest/` for now
  despite hosting live code — a rename is a future tidy, not this change.
