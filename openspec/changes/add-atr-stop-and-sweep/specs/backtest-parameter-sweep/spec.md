## ADDED Requirements

### Requirement: Sweep execution over atr_multiple
The sweep runner SHALL execute the backtest once per `atr_multiple` value in
a configured range, holding `atr_period` and the Donchian lookbacks fixed
across all runs, and SHALL require the loaded risk rules to have
`stop_method: atr` before running.

#### Scenario: sweep refuses to run in channel mode
- **WHEN** the sweep runner is invoked and the loaded risk rules have
  `stop_method: channel` (or omit `stop_method`)
- **THEN** it exits with an error before running any backtest

#### Scenario: sweep runs one backtest per multiple
- **WHEN** the sweep runner is invoked with the loaded risk rules having
  `stop_method: atr` and a configured list of `atr_multiple` values
- **THEN** it produces one backtest result per value in the list, with
  `atr_period` identical across every run

### Requirement: Sweep comparison output
The sweep runner SHALL report, per `atr_multiple` value, the number of
trades, win rate, expectancy in R and in percent, total P&L, and max
drawdown, and SHALL persist the full set of per-multiple results to
`backtest/results/`.

#### Scenario: comparison table printed
- **WHEN** a sweep completes
- **THEN** it prints a table with one row per `atr_multiple` showing trades,
  win rate, expectancy (R), expectancy (%), total P&L, and max drawdown

#### Scenario: sweep results persisted
- **WHEN** a sweep completes
- **THEN** a JSON file is written under `backtest/results/` containing the
  per-multiple results, matching the persistence pattern already used by
  `backtest/run.js`

### Requirement: Max drawdown statistic
`summarize()` SHALL compute max drawdown, as both a percent and a dollar
figure, from the closed-trade equity curve derived from a starting equity
and the chronologically ordered list of closed trades.

#### Scenario: drawdown computed from equity curve
- **WHEN** `summarize` is called with a starting equity and a
  chronologically ordered list of closed trades
- **THEN** it returns `maxDrawdownPct` and `maxDrawdownUsd` reflecting the
  largest peak-to-trough decline of cumulative equity (`startEquity` plus
  running P&L) across the trade sequence

#### Scenario: no drawdown on an empty or all-winning trade sequence
- **WHEN** `summarize` is called with no trades, or with trades whose
  cumulative P&L never declines from its running peak
- **THEN** it returns `maxDrawdownPct` and `maxDrawdownUsd` equal to zero
