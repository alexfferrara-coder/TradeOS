# TradeOS Product Roadmap — à-la-carte tools

_2026-07-09 · prioritized build order. Context: [TradingView teardown](2026-07-09-tradingview-teardown.md)._

**Model:** build TradingView's toolset as **discrete products sold à la carte**
(land-and-expand), and win on the layer they lack — **automated, risk-gated
execution**. Priority logic: (1) leverage the engine we already have, (2) build
the hub + funnel first, (3) value-to-effort. `[~]` = in progress.

## Tier 0 — Hub & foundation (build first)
- [~] **App Home** — headline value + equity curve + Command Center button
- [ ] **Supercharts** — the charting workspace; **trade manually from the chart**. Our hub. *(prototype in progress)*
- [ ] **Broker connection + comparison page** — connect Alpaca/Schwab/IBKR; compare/contrast. Our connection layer + SEO + monetization, in one.
- [ ] **Auth / multi-tenant** — required before we can sell anything.
- [ ] **À-la-carte packaging + billing** — per-tool SKUs, land-and-expand upsell.

## Tier 1 — Beachhead tools (our engine's strengths; sell these first)
- [x] **Strategy Backtester (live parity)** — flagship differentiator; the `decide.js` engine already powers backtest ⇄ live. TradingView's Pine tester has no live-parity guarantee. *(prototype: `prototypes/backtester.html`)*
- [x] **Risk-gated Screener** — a stock screener that filters *and* pre-computes the risk gate (position size, ATR stop, R). Our version of their Stock Screener. *(prototype: `prototypes/screener.html`)*
- [ ] **Paper Trading** — we already have the paper dry-run loop; productize it.
- [x] **Portfolios / equity tracking** — folds in the equity-capture work from the App Home spec. *(prototype: `prototypes/portfolios.html`)*
- [x] **Alerts** — price / signal / risk-limit alerts. *(prototype: `prototypes/alerts.html`)*

## Tier 2 — Context & data tools (retention + funnel breadth)
- [ ] **Watchlists**
- [ ] **News Flow**
- [ ] **Calendars** — Economic + Earnings first (Dividend/Revenue later)
- [ ] **Heatmaps** — stocks / ETFs / crypto

## Tier 3 — Specialized depth (later differentiation)
- [ ] **Fundamental Graphs**
- [ ] **Macro maps** — economic indicators by country
- [ ] **Yield Curves**
- [ ] **Options** — chains, strategy builder, vol curves
- [ ] **Seasonals**

## Cross-cutting
- [ ] **AI copilot layer** — every tool explains itself (why a name screened, tune a strategy, risk copilot) on the latest Claude models. Our "can't-retrofit" edge.
- [ ] **B2B charting-library licensing** — long-term; mirror their 40k-company engine-license business.
- [ ] **Money-bridge (deposit/withdraw/transfer)** — legally gated; a differentiator TradingView explicitly doesn't do.

**Beachhead pick:** lead with the **Backtester-with-live-parity** and the
**Risk-gated Screener** — both ride the engine that already exists, and both
express the "analysis → decision → guarded execution" wedge.
