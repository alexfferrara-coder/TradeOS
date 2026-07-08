## Context

`runBacktest` is a batch portfolio simulator: it owns the full history, tracks
its own equity, and processes exits-then-entries for every date at once. A live
loop is a single-day decision keyed off *actual* account state (equity and open
positions read from the broker). The strategy/gate logic is identical; only the
harness differs. `loadRiskRules` (fail-closed) and `sizePosition` already sit at
the right seam. This change factors the decision logic so both harnesses share
it, then builds a safe, read-only, dry-run live loop on top.

## Goals / Non-Goals

**Goals:**
- Extract `decideExit`/`decideEntry` so backtest and live share one decision
  path (no drift), with `runBacktest` behavior byte-for-byte unchanged.
- A manual dry-run loop that reads Alpaca paper account state and reports
  intended orders on the latest completed bar, submitting nothing.
- Testable without network (broker injected/mocked).

**Non-Goals:**
- Submitting orders (v2), scheduling, real-money/live-api, and the UI.
- A general multi-broker interface — build Alpaca concretely, shaped so an
  interface can be extracted later.
- Renaming `backtest/` to reflect that it now hosts live code.

## Decisions

**Two pure decision functions, not one.** Exits and entries run in distinct
phases (exits first to free correlation-cap slots, then entries against the
resulting `openCount` and shared equity), so `decide.js` exposes
`decideExit({ bars, i, position, config })` and
`decideEntry({ bars, i, equity, openCount, rules, strategy, config })`. Both
`runBacktest` and `live.js` orchestrate the phases themselves but delegate the
actual decision to these — the orchestration differs, the judgement does not.

**Live needs its own position-state store.** The broker reports positions
(symbol, qty, avg price) but not our `stopLevel`/`riskPerShare`/`entryDate` —
those are strategy state set at entry, required to evaluate the ATR hard stop.
`state.js` persists them locally (gitignored JSON), keyed by symbol, reconciled
against the broker's actual positions on each run. In v1 the paper account
starts flat, so this is mostly plumbing that v2's order submission will
populate; building it now keeps the exit path correct from the start.

**Decide on the last completed daily bar.** Intraday, the broker's "today" bar
is partial; deciding on it would act on incomplete data. `live.js` uses the
most recent *closed* session, labels the decision date explicitly, and warns if
the market is currently open (the freshest bar may still move).

**Paper endpoint hardcoded; no submission code exists in v1.** Account/positions
use `paper-api.alpaca.markets`. There is no `submitOrder` path in this change at
all — not a guarded one — so accidental submission is impossible. Live-api and
order submission are deliberate, separately-scoped later changes.

**Broker is injected.** `live.js` takes a broker object (real Alpaca adapter in
production, a mock in tests), so the orchestration is unit-testable without
network and the adapter can later be swapped for another broker.

**`getRecentBars` fetches ~250 recent bars, uncached.** The decision needs the
200-day SMA, 20-day high, 10-day low, and ATR(14) as of today, so it fetches a
rolling recent window up to the latest session — distinct from `alpaca.js`'s
fixed-window, on-disk-cached historical fetch, which stays as-is for the
backtest.

## Risks / Trade-offs

- **[Risk] Decision/position reconciliation drift.** If the local state store
  and the broker's positions disagree (e.g. a position opened outside the
  system), the exit decision could use a wrong or missing stop. → Mitigation:
  on each run, reconcile and flag any broker position without local state
  rather than guessing; in v1 (flat account, no submission) this is inert but
  the guard is in place.
- **[Risk] Bar basis mismatch.** Backtest uses split/dividend-adjusted bars
  (`adjustment=all`); live decisions must use the same basis or signals shift.
  → Mitigation: `getRecentBars` requests `adjustment=all`, matching `alpaca.js`.
- **[Trade-off] Refactor risk.** Extracting `decide.js` touches the core
  simulation loop. → Mitigation: the existing exact-trade and no-look-ahead
  integration tests must stay green unchanged; that is the acceptance bar for
  the refactor.

## Migration Plan

1. Extract `decideExit`/`decideEntry` into `decide.js`; rewire `runBacktest`;
   confirm all 43 existing tests pass unchanged.
2. Add `broker.js` (read-only Alpaca paper adapter) + `state.js` (position
   store), each unit-tested (broker via a fake fetch, state via temp files).
3. Add `live.js` orchestration; test with a mock broker (flat account →
   entry-only report; seeded positions → exit/hold report).
4. Document in `README.md`; add the state path to `.gitignore`.

Rollback: the live files are additive; reverting the `decide.js` extraction
restores the prior inline loop. Nothing here changes backtest behavior or
touches a real account beyond read-only paper queries.
