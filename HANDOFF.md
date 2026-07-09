# TradeOS — Session Handoff

_Last updated: 2026-07-09_

## Product direction — TradingView-style, sold à la carte (2026-07-09)
We studied TradingView as the model. It's a charting/analysis/social platform
(not a broker, holds no money); its hub is **Supercharts**, and it monetizes via
bundled subscription tiers + real-time data add-ons + a large **B2B charting-library
license** business (40k+ companies) + a **broker marketplace**. Our plan:
- Build its toolset as **discrete products sold à la carte** (land-and-expand) —
  a genuinely unclaimed position (TradingView *bundles* into tiers).
- **Don't out-chart them.** Win on the layer they lack: **automated, risk-gated
  execution** (our `decide.js` engine + ATR risk gate + backtest⇄live parity).
  Pitch = "analysis → decision → guarded execution."
- Build **our own Supercharts** — a charting workspace you can **trade manually**
  from, centered on the engine/risk (not just drawing tools).
- Beachhead tools: **Backtester-with-live-parity** + **Risk-gated Screener**.
- Full analysis: `docs/strategy/2026-07-09-tradingview-teardown.md`.
  Prioritized build order: `docs/strategy/product-roadmap.md`.
  Visual prototypes: `prototypes/` (branch `app-home-prototype`).

A running snapshot of where the project stands and what's next, so any new
session (or collaborator) can pick up immediately.

## What TradeOS is
A **commercial self-directed trading SaaS** (subscription/rental) — customers
connect their *own* brokerage accounts and run configurable, risk-gated
strategies. **Not** a personal tool, **not** discretionary money management
(we chose the self-directed software tier, which keeps TradeOS as software
rather than an RIA/fiduciary). Get a securities attorney's read before ever
enabling fully-automated execution of customer accounts.

## Current state — engine built, tested, running live (paper)
Under `backtest/` (Node, no deps beyond js-yaml) and `src/risk/`:
- **Strategy:** Donchian 20/10 breakout. Entry gated by a **regime filter**
  (only take breakouts above the 200-day SMA — adopted, enabled in
  `config.js`). Exits: 10-day channel trail + **ATR hard stop**.
- **Risk gate** (`src/risk/loadRiskRules.js`): reads limits from the user's
  Obsidian file `~/Documents/Risk As./Risk Framework/My Risk Rules.md`,
  fail-closed. Fields: `stop_method: atr`, `atr_period: 14`, `atr_multiple: 2.5`.
- **Shared decision brain** (`backtest/decide.js`): `decideEntry`/`decideExit`,
  used by *both* the backtest and the live loop (no drift). This is the seam a
  UI will also call.
- **Live paper loop** (`backtest/live.js`): dry-run — reads the Alpaca paper
  account, decides on the last completed bar, reports intended orders,
  **submits nothing**. Verified live ($100k paper account → real JPM ENTER
  signal).
- Also: `broker.js` (read-only Alpaca paper adapter), `state.js` (local
  position state), `run.js`, `sweep.js`, `regime-sweep.js`, `stats.js` (has max
  drawdown), `atr.js`, `gate.js`, `strategy.js`.
- **66 tests pass** (`node --test`).
- **Git:** clean, fully pushed to `github.com/alexfferrara-coder/TradeOS`
  (SSH). OpenSpec baseline has 5 archived capabilities: `atr-stop-loss`,
  `backtest-parameter-sweep`, `backtest-universe`, `regime-entry-filter`,
  `paper-trading`.

## Key strategy result (honest, de-biased 16-symbol universe, filter on)
`atr_multiple` **2.0 is best all-around**: expectancy 0.429R, win 50.5%,
+$22,326, 4.82% max DD. Live risk file still says 2.5 — the **2.0 edit is
pending** (user's call; personal Obsidian file).

## Decisions locked
- Business model: **self-directed SaaS**.
- **Dashboard is the next build**, "option A" = read-only React app reading the
  JSON reports the engine writes (no Alpaca keys in the browser).
- **Palette chosen** (dark "AI trading hub"): page `#0A0E17`, panel `#111726`,
  card `#1B2334`, border `#2A3448`; text `#EAEEF7` / `#9AA6BF` / `#5F6B85`;
  brand indigo `#6E56F7`, cyan `#22D3EE`; gain `#24C081`, loss `#FF5A5F`,
  caution `#F5B23B`. Pair up/down with arrows, not color alone.

## Home page design (brainstormed, not yet built)
- **Unpaid visitors → marketing landing page. Paying users → app home.**
- **App home hero = portfolio performance line graph**, filterable
  `1W / 3M / 6M / 1Y`, calm / easy on the eyes.
- Big **headline number**: total value + period gain/loss (green/red).
- A prominent **"Command Center" button** → the detailed dashboard (signals,
  portfolio, risk, strategy) already mocked in the dark palette.
- Slim one-glance health line ("strategy active · within limits · paper").
- **Recommended: a benchmark line** (portfolio vs. buy-and-hold S&P 500),
  toggleable — best in-product proof of value.
- **Implications:** (1) a 1Y curve requires *storing daily equity snapshots per
  user* (the live loop only reads today's equity) or pulling a broker
  portfolio-history endpoint; (2) new users need a graceful "since you started"
  empty state.

## Broker / data notes
- **Alpaca**: integrated; free paper trading works; recent bars use the **IEX
  feed** (free tier blocks recent SIP — that's why `broker.js` uses `iex`).
- **Fidelity & Webull**: no official retail trading API — avoid unofficial hacks.
- **Schwab**: official API (ex-TD Ameritrade), big trusted institution,
  requires developer approval — target for real-money customers.
- **IBKR**: official, multi-asset, more complex. **Kalshi**: CFTC event
  contracts — different instrument model, not the equities strategy.
- Productization layer still to build: multi-tenant auth, per-user broker
  connections (credential vault / OAuth), billing.

## Working conventions
- OpenSpec flow: `openspec new change` → write proposal/design/specs/tasks →
  `openspec validate <name> --type change` → implement →
  `openspec archive <name> -y`. Spec deltas use
  `## ADDED/MODIFIED/RENAMED Requirements`; a MODIFIED block must match the
  baseline header exactly (renaming needs a `RENAMED` block).
- Run scripts with keys: `set -a; . ./.env; set +a; node backtest/live.js`.
- Lint has pre-existing `process is not defined` errors in Node scripts
  (eslint config gap) — ignore, not real bugs.
- Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`. Commit and
  push when a change is done.

## Suggested first move next session
Build the **app home** (read-only, dark palette): headline number + filterable
performance graph (with benchmark line) + Command Center button. The Command
Center detail view is already mocked and can follow. Quick housekeeping
available too: drop delisted **WBA** from the universe; optionally set
`atr_multiple` to 2.0.
