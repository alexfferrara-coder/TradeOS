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

## Run

```bash
export APCA_API_KEY_ID=your_paper_key
export APCA_API_SECRET_KEY=your_paper_secret
node backtest/run.js
```

Requires Node 18+ (uses global `fetch`). No new npm dependencies.

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
  (% and R), expectancy (R and % per trade), total P&L, final equity.

## Known v1 simplifications (deliberate, not bugs)

- **Universe is survivorship-biased.** SPY/AAPL/MSFT/NVDA/JPM are known winners;
  v1 expectancy is a **plumbing check, not an edge estimate.**
- **Flat correlation cap.** `max_correlated_positions` is enforced as a flat
  portfolio-wide concurrent cap (every open position treated as correlated),
  not sector-grouped. Real correlation modeling is a later research-to-rules pass.
- **Close-based exits.** Both the channel exit and the hard stop are evaluated on
  the daily close — no intrabar fills or gap-through modeling.
- **Costs.** `costBps` (slippage + commission) defaults to 0; set it in `config.js`.
