# App Home + Engine Equity Capture — Design

_Date: 2026-07-08 · Status: approved for implementation_

## Goal

Build the **customer app home** (the screen a paying user lands on) plus the
**engine equity/balance capture** that feeds it. Two pieces, built together:

1. **App home UI** — a calm, dark-themed home whose hero is a portfolio
   performance curve, with a big headline total value, a health line, a
   Command Center button, and future-proof (inert) money-movement slots.
2. **Engine equity/balance capture** — a server-side Node script that records
   the user's real account equity over time and writes the JSON the UI reads.

This is the "app" half of TradeOS (a self-directed trading SaaS). The strategy
engine already exists under `backtest/` and `src/risk/`; this design adds the
first real customer-facing surface.

## Scope

**In scope (this build):**
- Engine equity capture: forward-only daily snapshots + benchmark, written as
  static JSON.
- App home screen: hero curve + headline total, balances row, health line,
  Command Center button, empty/loading/error states.
- Routing: `/` (home) and `/command-center` (stub page).
- Future-proof money slots: a "TradeOS Cash — $0" card and visibly-disabled
  Deposit / Withdraw / Transfer buttons. **No real money moves.**

**Explicitly deferred (NOT this build):**
- Auth + the unpaid-visitor marketing landing page and paid/unpaid gating.
- Real money movement: the broker→bank withdrawal bridge (#3) and any
  TradeOS-held balance / deposits / transfers (#4). These are **legally gated**
  (money-transmitter licensing or a custodian/BaaS partner such as Alpaca
  Broker API, plus KYC/AML and a securities+fintech attorney). The UI leaves a
  future-proof slot for them; the backend is a separate, later project.
- The full Command Center detail view (signals / portfolio / risk / strategy).
  This build ships the **button and a stub page** only.
- Multi-broker aggregation beyond the one wired Alpaca paper account. The data
  model supports N accounts; only Alpaca is populated now.

## Regulatory note (load-bearing context, not legal advice)

"Customers deposit and hold a balance in our system" = **custody of client
funds** = money-transmission / likely broker-dealer obligations — a heavier
regulatory tier than the self-directed-software model TradeOS chose. Bridging a
withdrawal (money never rests with us) is lighter but still regulated. This
design deliberately builds **only the UI slot** for those flows and moves zero
real money, so nothing here triggers those obligations. Engage a securities +
fintech attorney and select a custodian/BaaS partner before building #3/#4.

## Architecture / Data flow

Alpaca API keys must stay **server-side** (never in the browser). So:

```
[ Alpaca paper account ]
        │  (server-side, keys in .env)
        ▼
backtest/snapshot.js  ──►  backtest/results/equity-history.json   (source of truth, persisted, gitignored)
        │
        └───────────────►  public/data/home.json                  (app-facing snapshot the UI fetches)
        ▲
        │  fetch('/data/home.json')
[ React app home ]  (read-only, no keys)
```

- **Rejected:** a live Express API the browser calls at runtime (the deferred
  "option B" — more moving parts, a server to run). **Rejected:** build-time
  JSON `import` (can't refresh without a rebuild).
- `backtest/results/` is already gitignored ("persisted run output"), so the
  growing `equity-history.json` survives locally and is never committed as
  account data.
- `public/data/home.json` is committed as an **empty-state starter** (empty
  series, `tradeosCash: 0`, no accounts). The engine overwrites it locally with
  real data; that overwrite is the user's to commit or not. In the real
  multi-tenant product this file becomes per-user runtime data from a backend,
  so shipping an empty scaffold in the repo is correct.

## Component 1 — Engine equity/balance capture (`backtest/snapshot.js`)

Runs manually, same convention as the other scripts:
`set -a; . ./.env; set +a; node backtest/snapshot.js`.

Responsibilities:
1. Read the **current** account equity and cash from Alpaca (reuse
   `broker.js` / `alpaca.js` patterns; read-only).
2. **Append one dated row** to `equity-history.json`, keyed by ET calendar
   date. If a row for today already exists (script run twice in a day),
   **update it in place** (dedupe by date) rather than adding a duplicate.
   This is forward-only — no historical backfill.
3. Capture a **benchmark** point for the same date: SPY daily close (via the
   existing `alpaca.js` bar cache), stored raw. Normalization to the series'
   first point happens at read/shape time so it's always relative to "since you
   started."
4. Compute `totalValue = Σ (connected-account equity) + tradeosCash`, where
   `tradeosCash = 0` for now but is a real field in the model.
5. Compute `periodChange` for `1W / 3M / 6M / 1Y` from the series (abs + pct;
   each falls back to the earliest available point when history is shorter than
   the window).
6. Write `public/data/home.json`.

### Data shapes

`backtest/results/equity-history.json` (source of truth):
```json
[
  { "date": "2026-07-08", "equity": 100000.00, "spyClose": 552.31 }
]
```

`public/data/home.json` (app-facing) — the block below is an **illustrative
populated example**. The value **committed** to the repo is the empty-state
starter: `totalValue: 0`, `tradeosCash: 0`, `accounts: []`, `series: []`,
`periodChange` all-zero. The engine overwrites it locally with real values.
```json
{
  "asOf": "2026-07-08",
  "totalValue": 100000.00,
  "tradeosCash": 0,
  "accounts": [
    { "id": "alpaca-paper", "name": "Alpaca Paper", "broker": "alpaca",
      "mode": "paper", "equity": 100000.00, "cash": 100000.00 }
  ],
  "periodChange": {
    "1W": { "abs": 0, "pct": 0, "coversFullWindow": false },
    "3M": { "abs": 0, "pct": 0, "coversFullWindow": false },
    "6M": { "abs": 0, "pct": 0, "coversFullWindow": false },
    "1Y": { "abs": 0, "pct": 0, "coversFullWindow": false }
  },
  "series": [
    { "date": "2026-07-08", "equity": 100000.00, "benchmark": 100000.00 }
  ],
  "benchmarkSymbol": "SPY",
  "health": { "strategy": "active", "withinLimits": true, "mode": "paper" }
}
```

- `series[].benchmark` is SPY **normalized to the same starting equity** as the
  portfolio (both begin at the series' first `equity`), so the two lines are a
  fair "since you started" comparison.
- `coversFullWindow: false` lets the UI label a range as "all history so far"
  when it doesn't yet span the full window.

### Pure functions (unit-tested with `node --test`)

Keep IO thin; put logic in pure, exported helpers, matching the existing
`decide.js` pattern:
- `upsertDailyRow(history, row)` — append-or-replace-by-date, returns new array.
- `normalizeBenchmark(series)` — rebase SPY to the portfolio's first point.
- `computePeriodChange(series, window)` — abs/pct + `coversFullWindow`.
- `buildHome({ history, account, tradeosCash })` — assemble `home.json`.

Alpaca fetching stays in a thin wrapper and is **not** unit-tested (network).

## Component 2 — App home UI

Replaces the `TradingPlanningBoard` placeholder as the app's main screen.
Dark palette from memory (page `#0A0E17`, panel `#111726`, card `#1B2334`,
border `#2A3448`; text `#EAEEF7 / #9AA6BF / #5F6B85`; indigo `#6E56F7`, cyan
`#22D3EE`; gain `#24C081`, loss `#FF5A5F`, caution `#F5B23B`). Always pair
up/down with **▲/▼**, never color alone.

Layout, top to bottom:
- **Header** — TradeOS wordmark + slim one-glance **health line**
  (`strategy active · within limits · paper`), driven by `health`.
- **Hero** —
  - Big **headline total value** (`totalValue`) + selected-period gain/loss
    (abs + pct, ▲/▼, green/red).
  - **Range tabs**: `1W / 3M / 6M / 1Y`. A tab whose window exceeds available
    history still renders and is labeled "all history so far."
  - **Performance chart**: a calm, hand-rolled **SVG line chart** —
    portfolio line with a soft area fill, a muted **benchmark line** with a
    **toggle**, a hover **crosshair + tooltip** (date, value, vs-benchmark).
    Hand-rolled (no chart-lib dependency) for full palette control; the
    `dataviz` skill guides the visual design during implementation.
  - **Empty state**: with 0–1 data points, show the headline total + a
    "building your performance history — check back as it grows" message
    instead of a misleading flat line. The curve renders once there are ≥2
    points.
- **Balances row** — one card per connected account (Alpaca Paper) **plus a
  "TradeOS Cash — $0" card**. Each card carries **[Deposit] [Withdraw]
  [Transfer]** rendered **visibly disabled** with a "coming soon" affordance.
  This is the future-proof money slot; it moves no money.
- **Command Center** — a prominent button → `/command-center`.
- **Loading / error** states around the `fetch('/data/home.json')`.

### Data loading

A small hook/util `fetch('/data/home.json')` with three states: loading, error
(show a retry message), loaded. Missing/empty `series` → the empty state above.

## Routing

Add **`react-router-dom`**:
- `/` → `AppHome`
- `/command-center` → `CommandCenter` **stub** ("Command Center — coming soon,"
  themed, with a back link).

This seeds the eventual `marketing-landing (unpaid) vs app-home (paid)` split
without building auth now.

## File plan

New:
- `backtest/snapshot.js` — capture script (thin IO) + exported pure helpers.
- `test/snapshot.test.js` — `node --test` for the pure helpers.
- `public/data/home.json` — committed empty-state starter.
- `src/app/AppHome.jsx`, `src/app/CommandCenter.jsx` — screens.
- `src/app/components/` — `HeadlineValue`, `PerformanceChart`, `RangeTabs`,
  `HealthLine`, `BalancesRow`, `AccountCard`, `MoneyActions` (inert).
- `src/app/theme.js` (or CSS variables) — the palette tokens in one place.
- `src/app/useHomeData.js` — fetch + states.

Modified:
- `src/App.jsx` / `src/main.jsx` — mount the router; home is the default route.
- `package.json` — add `react-router-dom`.

Left in place (not deleted this build): `src/TradingPlanningBoard.jsx` — no
longer the default screen; can be removed or repurposed later.

## Testing & verification

- **Unit** (`node --test`, consistent with the repo's 66 existing tests): the
  four pure helpers in `snapshot.js` — upsert/dedupe, benchmark normalization,
  period-change windows (incl. short-history fallback), home assembly.
- **No React unit-test infra exists** (no jsdom/runner); adding one is out of
  scope. The UI is verified **manually / visually** via the dev server and the
  Preview tooling: empty state (starter JSON), then a populated state (a small
  hand-made multi-point fixture), range tabs, benchmark toggle, hover tooltip,
  disabled money buttons, and the Command Center navigation.
- Lint has pre-existing `process is not defined` noise in Node scripts — ignore
  (documented in HANDOFF).

## Open follow-ups (post-build, tracked, not blocking)

- Wire real per-user, multi-broker aggregation once auth + broker-connection
  layer exists.
- Replace the static `home.json` with a per-user backend feed.
- Build the funds bridge (#3) and custody (#4) behind the money slots — after
  legal + partner selection.
- Housekeeping noted in HANDOFF (drop delisted WBA; optional `atr_multiple`
  2.5→2.0) — independent of this build.
