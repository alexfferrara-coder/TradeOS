## Context

`backtest/config.js` holds a fixed `symbols` array of five instruments, all of
which trended up over the 2019–2024 window. `runBacktest` iterates that array;
`alpaca.js` fetches and caches daily bars per symbol; `run.js` and `sweep.js`
report aggregate stats across whatever symbols are configured. Nothing in the
simulation logic assumes a particular universe — the universe is pure input.
This change is therefore almost entirely a data/config change, by design: it
is the honest-baseline step that must precede the regime entry filter.

## Goals / Non-Goals

**Goals:**
- Replace the survivorship-biased 5-symbol universe with a 16-symbol universe
  that includes real, sustained drawdowns across several distinct failure
  modes.
- Produce the first non-survivorship-biased sweep of `atr_multiple`.
- Keep all simulation, gate, ATR, and sweep logic byte-for-byte unchanged.

**Non-Goals:**
- The regime entry filter (separate later change).
- Reworking the flat correlation cap into a sector-grouped model.
- Locking in an `atr_multiple` value (decided later, from the honest sweep).
- Per-symbol or cohort-tagged statistics (the per-trade log already prints the
  symbol; eyeballing is enough for now).
- Including truly delisted/dead names (Alpaca lacks the data).

## Decisions

**Universe composition — spread by failure mode, not by sector.** The value of
a de-biased universe for testing a loss-avoidance filter is the *variety* of
ways a position can go wrong, so the additions are chosen to cover distinct
failure archetypes rather than to balance sectors:

| Symbol | Archetype |
| ------ | --------- |
| BA     | Idiosyncratic disaster (737 MAX + COVID), never round-tripped |
| INTC   | Secular decline |
| WBA    | Value trap / steady multi-year grind down |
| T      | Secular decline / dividend value trap, choppy |
| DIS    | Struggling megacap, choppy post-COVID |
| NKE    | Clean in-window decline off the 2021 peak |
| PYPL   | Growth crash that stayed down |
| ROKU   | Growth crash that stayed down |
| NFLX   | Growth crash (~75% in 2022) that recovered — tests filter *whipsaw cost* |
| META   | Growth crash (~65% in 2022) that recovered |
| F      | Choppy cyclical — many failed breakouts |

GE was considered and rejected: across 2019–2024 it is net a recovery story
(bottomed in COVID, then ran up), so it is a weak "loser" for this window.
NKE replaces it as a cleaner in-window decliner.

**Re-sweep, don't re-decide the multiple yet.** The change runs
`node backtest/sweep.js` on the new universe and records the result, but does
not change `atr_multiple` in the live risk-rules file. The 1.5-vs-2.5 question
is deliberately deferred until the honest numbers exist, because the current
preference was formed on flattered (loss-free) drawdown figures.

**Capture the de-biasing as a durable requirement, not just a config edit.**
The point of this change is methodological, not cosmetic. Encoding "the
universe SHALL include instruments with documented sustained drawdowns" as a
spec requirement prevents a future edit from quietly trimming the universe back
to winners and silently invalidating every loss-avoidance test built on top of
it.

## Risks / Trade-offs

- **[Risk] The flat correlation cap blunts the de-biasing.** With 16 symbols
  and only 2 concurrent slots, the portfolio is often "full," so some added
  loser-entries never get taken. → Mitigation: accepted for this change. The
  losers still change the opportunity set and the realized drawdowns of what
  *is* taken; fully addressing it is the deferred sector-correlation work. Do
  not "fix" it here by loosening the cap — that would conflate two changes.
- **[Risk] Data availability / coverage for the new names.** All 11 are
  currently listed and predate 2019, so daily history back to `2019-01-01`
  should fetch cleanly on the configured feed. → Mitigation: the first run
  surfaces any gap immediately (a symbol with zero/short bars is visible in the
  per-symbol bar-count line `run.js` already prints).
- **[Trade-off] Survivorship ceiling remains.** "Fell hard but survived" is
  most of the bias removed, not all; the absolute expectancy/P&L numbers are
  still not a live-edge estimate, only a much better plumbing-and-behavior read.

## Migration Plan

1. Add the 11 symbols to `config.symbols`.
2. Update the `backtest/README.md` universe note.
3. Run `node backtest/run.js` — confirm all 16 symbols fetch with plausible
   bar counts and the run completes.
4. Run `node backtest/sweep.js` — record the honest `atr_multiple` comparison.

Rollback is trivial: revert the `symbols` array. No logic changed, so nothing
else can regress.
