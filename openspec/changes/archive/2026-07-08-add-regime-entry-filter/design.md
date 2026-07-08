## Context

`backtest/backtest.js` takes every Donchian breakout that passes the risk
gate. `strategy.js` already provides small, stateless trailing-window helpers
(`highestClose`, `lowestClose`) recomputed per call. `config.js` holds
backtest/strategy parameters as a module-level object; `rules` (risk limits)
are passed into `runBacktest` as an argument. The `atr_multiple` sweep works by
passing a modified `rules` copy per run. This change adds a trend-regime entry
gate and a sweep to measure it — the first strategy-behavior change, built to
be A/B-measurable on the de-biased universe.

## Goals / Non-Goals

**Goals:**
- Add a default-off regime filter: take a long breakout only when
  `close > SMA(smaPeriod)`.
- Make the filter and its SMA horizon injectable so a sweep can compare
  filter-off vs filter-on across SMA lengths, with `atr_multiple` held constant.
- Preserve today's behavior exactly when the filter is off (byte-for-byte).

**Non-Goals:**
- The stricter "SMA rising / positive slope" variant (start simple).
- Applying the filter to exits (entry-only).
- Changing the live risk-rules file or deciding `atr_multiple`.
- Precomputing an SMA series (unnecessary — SMA is stateless).

## Decisions

**`smaClose` is a stateless per-call helper in `strategy.js`, not a
precomputed series.** Unlike Wilder ATR (sequential, so precomputed once per
symbol), a simple moving average is just a trailing-window mean — cheap to
recompute per entry check, exactly like `highestClose`/`lowestClose`. It uses
the same "prior N days" indexing convention (`[i-period, i-1]`) for consistency
with those helpers, so the regime check is "is today's close above the average
of the prior N closes," with today excluded from its own average.

**The filter is injected via a new optional `strategy` parameter on
`runBacktest`, not read from the module import.** `runBacktest(barsBySymbol,
rules, strategy = config.strategy)`. Sweeping a strategy parameter requires it
to be injectable per run; `atr_multiple` gets this for free by riding in
`rules`, but the regime settings are strategy config. Rather than mutate the
`config` module (global state) or fold regime settings into `rules` (wrong
home — `rules` is risk/sizing), `runBacktest` gains a defaulted third argument.
`run.js` calls it two-arg (uses `config.strategy`); `regime-sweep.js` passes an
override per run. Backward-compatible and side-effect-free.

**Default `enabled: false`.** The filter must be opt-in so that: existing tests
(which call `runBacktest` two-arg) are unaffected; the filter-off row of the
regime sweep is a true reproduction of today's baseline; and turning it on is a
deliberate, measured choice, not a silent behavior change on next run — a
contrast with the ATR change, which flipped live behavior on first run and had
to be flagged.

**Warm-up guard extended.** With the filter on, an entry at index `i` needs
`smaPeriod` prior closes, so the existing entry warm-up (`i < entryLookback`,
plus the ATR warm-up when in ATR mode) gains `i < smaPeriod` when the filter is
on. Same shape as existing guards; ~200 entry-dead bars per symbol when
`smaPeriod` is 200, immaterial on 1510-bar histories.

**A separate `regime-sweep.js`, not an extension of `sweep.js`.** Each sweep
stays single-purpose (matching the existing one-file-per-concern layout). The
regime sweep holds `atr_multiple` fixed and varies the regime config; the atr
sweep does the reverse. It emits a filter-off baseline row plus one row per
`regimeSmaPeriods` value so the comparison is self-contained.

## Risks / Trade-offs

- **[Risk] The filter's benefit may be masked by the correlation cap.** With
  16 symbols contending for 2 slots, some skipped-vs-taken differences never
  materialize because the portfolio was full anyway. → Mitigation: accepted;
  same known limitation as the de-bias change. The sweep still shows the
  net effect on what actually traded, which is the honest read.
- **[Risk] Fewer trades → noisier stats.** Filtering removes entries, so
  higher-SMA rows will have smaller trade counts and less statistically
  reliable win-rate/expectancy. → Mitigation: report trade counts in the table
  (already planned) so thin samples are visible, and judge on the whole curve,
  not one row.
- **[Trade-off] Isolation vs realism by holding `atr_multiple` at 2.5.** Fixing
  the multiple isolates the filter's effect but means the comparison isn't at
  the (separately) best-looking 2.0. Accepted: one variable at a time. A joint
  filter×multiple sweep is possible later if the filter proves worthwhile.

## Migration Plan

1. `smaClose` in `strategy.js` + unit tests.
2. `config.js`: add `strategy.regimeFilter` and `sweep.regimeSmaPeriods`.
3. `backtest.js`: optional `strategy` param, default-off entry gate, warm-up
   guard; extend integration tests (filter on gates an entry; filter off
   identical to before).
4. `regime-sweep.js`: filter-off baseline + per-SMA rows, persist JSON.
5. `README.md` docs.
6. Verify: `node --test` green; run `regime-sweep.js` and read the table.

Rollback: default-off means reverting is safe at any point; nothing changes
live behavior until the filter is explicitly enabled.
