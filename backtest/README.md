# TradeOS Backtest — Donchian 20/10, risk-gated (v1)

First code past the risk-loader bridge. A minimal Node backtest of a fixed
breakout strategy whose every entry is sized and vetoed by the existing risk
gate (`../src/risk/loadRiskRules.js`) — one gate, no duplicated rule logic.

## Strategy (fixed — do not modify)

- **Entry:** today's close > highest close of the prior 20 days.
- **Exit:** today's close < lowest close of the prior 10 days, **OR** a hard
  stop at 1x entry risk — whichever triggers first.
- **Entry risk (R):** `R = entryClose − (prior-10-day low at entry)`. The hard
  stop sits at `entry − 1R` (fixed); the 10-day channel low trails upward. Both
  are checked every day; the channel low is always ≥ the fixed stop, so a
  channel hit is the binding exit and the fixed stop is the floor.

## Risk gate

`run.js` calls `loadRiskRules()` **before anything else** and **fails closed**:
if the rules can't load or validate, the backtest refuses to run. The loaded
limits (`max_risk_per_trade` 1%, `max_position_pct` 20%, `max_correlated_positions`)
drive position sizing and entry rejection in `gate.js`. No rule numbers are
hardcoded in the backtest.

## Stop method: channel vs. ATR

The risk rules file also declares `stop_method` (`atr` | `channel`),
`atr_period`, and `atr_multiple`. `channel` (or omitting `stop_method`
entirely) keeps the original behavior: risk-per-share is the entry-to-prior-
10-day-low distance, so the trailing channel exit is always the binding exit
and the "hard stop" is a redundant floor. `atr` derives risk-per-share from
Wilder's average true range instead (`R = atr_multiple × ATR(atr_period)` at
entry) — a real, independent stop distance that can bind before the channel
exit does. Either way, the Donchian 20/10 entry/exit condition itself is
unchanged; only the stop-loss source differs. Sizing (`gate.js`) doesn't
care which produced the stop level.

## Run

```bash
export APCA_API_KEY_ID=your_paper_key
export APCA_API_SECRET_KEY=your_paper_secret
node backtest/run.js
```

Requires Node 18+ (uses global `fetch`). No new npm dependencies.

## Sweep (atr_multiple only)

```bash
export APCA_API_KEY_ID=your_paper_key
export APCA_API_SECRET_KEY=your_paper_secret
node backtest/sweep.js
```

Runs the backtest once per value in `config.sweep.atrMultiples`, holding
`atr_period` and the Donchian lookbacks fixed, and prints a comparison table
(trades, win rate, expectancy R/%, total P&L, max drawdown) per multiple.
**Requires `stop_method: atr` in the risk rules file** — it refuses to run
otherwise, since sweeping `atr_multiple` is meaningless when `channel` is the
active stop source. Results are persisted to `backtest/results/` the same
way `run.js`'s are.

## Regime entry filter

An optional trend filter on entries: when enabled, a long breakout is taken
only if the entry-bar close is above its own long-term SMA — i.e. only in an
uptrend. It is **strategy** config (not risk), so it lives in `config.js` under
`strategy.regimeFilter` (`{ enabled, smaPeriod }`), separate from the risk
rules file. It is **off by default**; off reproduces the pre-filter behavior
exactly. It gates entries only — exits are untouched.

Note the filter only *bites* when `smaPeriod` is longer than `entryLookback`
(20): a fresh 20-day-high breakout is by construction above any shorter
average, so the SMA must reach further back (into older, higher prices) to veto
a breakout that fires inside a longer downtrend.

## Regime sweep

```bash
export APCA_API_KEY_ID=your_paper_key
export APCA_API_SECRET_KEY=your_paper_secret
node backtest/regime-sweep.js
```

Runs a **filter-off baseline** plus one run per value in
`config.sweep.regimeSmaPeriods` (filter on), holding `atr_multiple` constant so
each row's differences reflect the filter and its horizon, not the stop
distance. Prints the same comparison columns as the atr sweep and persists to
`backtest/results/`. This table is the decision input for whether the regime
filter earns its keep (better expectancy/drawdown) or is net cost (fewer
trades for no gain).

## Live paper dry-run

```bash
export APCA_API_KEY_ID=your_paper_key
export APCA_API_SECRET_KEY=your_paper_secret
node backtest/live.js
```

Runs the strategy once against your Alpaca **paper** account and reports the
orders it *would* place — **it submits nothing** (there is no order-submission
code in v1). It loads the risk rules first and fails closed, reads account
equity and open positions from the paper endpoint, decides on the **last
completed daily bar** (never a partial in-progress one), and prints/saves a
per-symbol report (`ENTER` with size and stop, `EXIT` with reason, `HOLD`,
`SKIP` with reason, or `FLAGGED`). The decision logic is the exact same
`decide.js` the backtest uses, so live and backtest can't drift.

Per-position strategy state (stop level, risk per share) that the broker
doesn't track is kept locally in `backtest/live-state.json` (gitignored);
a broker position with no local state is flagged rather than guessed. Reports
are written to `backtest/results/` as `live-<timestamp>.json`.

Recent bars use the **`iex`** feed (free): the free Alpaca data plan blocks
*recent* `sip` data (`403 subscription does not permit querying recent SIP
data`). The backtest still uses `sip` for history. IEX daily closes can differ
slightly from the consolidated close, so live signals may not exactly match a
`sip`-based backtest — a known free-tier limitation, not a bug.

## Data

Daily OHLCV from Alpaca's historical market-data API, **read-only** — it issues
only `GET /v2/stocks/.../bars` requests. It places no orders and touches no
account state; paper keys are fine. Bars are cached to `backtest/data/` (gitignored)
so re-runs don't refetch. Default feed is `iex` (free); set `feed: 'sip'` in
`config.js` for full coverage with a paid data plan.

## Output

- Per-trade log: symbol, entry/exit dates, exit reason (`channel` | `hard-stop`),
  R-multiple, return %, P&L $.
- Summary: number of trades (and gate rejections), win rate, avg win/loss
  (% and R), expectancy (R and % per trade), total P&L, final equity, max
  drawdown (% and $, from the closed-trade equity curve).

## Known v1 simplifications (deliberate, not bugs)

- **Universe is de-biased, but not fully.** The original five (SPY/AAPL/MSFT/
  NVDA/JPM) were all winners; the universe now adds eleven names with real,
  sustained drawdowns spread across failure modes — idiosyncratic disaster
  (BA), secular decline (INTC, WBA, T), struggling megacaps (DIS, NKE), growth
  crashes that stayed down (PYPL, ROKU), growth crashes that recovered (NFLX,
  META), and a choppy cyclical (F). This lets loss-avoidance logic (e.g. a
  future regime filter) be judged on both its cost and its benefit. Remaining
  ceiling: no truly delisted/dead names (SVB, bankruptcies) — Alpaca lacks the
  data — so this is "fell hard but survived," most of the bias gone, not all.
  Absolute expectancy/P&L is still a behavior read, not a live-edge estimate.
- **Flat correlation cap.** `max_correlated_positions` is enforced as a flat
  portfolio-wide concurrent cap (every open position treated as correlated),
  not sector-grouped. Real correlation modeling is a later research-to-rules
  pass. Note: with 16 symbols competing for 2 concurrent slots, this cap now
  rejects far more entries than it did at 5 symbols — the gate working as
  designed, and part of why the de-biasing doesn't fully "bite" yet.
- **Close-based exits.** Both the channel exit and the hard stop are evaluated on
  the daily close — no intrabar fills or gap-through modeling.
- **Costs.** `costBps` (slippage + commission) defaults to 0; set it in `config.js`.
