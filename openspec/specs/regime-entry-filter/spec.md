# regime-entry-filter Specification

## Purpose
TBD - created by archiving change add-regime-entry-filter. Update Purpose after archive.
## Requirements
### Requirement: Regime filter gates entries by trend
When the regime filter is enabled, the backtest SHALL take an otherwise-valid
long breakout entry only if the entry-bar close is strictly above the simple
moving average of the prior `smaPeriod` closes; otherwise it SHALL skip the
entry. The filter SHALL apply only to entries and SHALL NOT affect exits.

#### Scenario: breakout above the SMA is taken
- **WHEN** the regime filter is enabled and a breakout entry occurs on a bar
  whose close is above the prior-`smaPeriod` SMA
- **THEN** the entry proceeds to the risk gate as usual

#### Scenario: breakout below the SMA is skipped
- **WHEN** the regime filter is enabled and a breakout entry occurs on a bar
  whose close is at or below the prior-`smaPeriod` SMA
- **THEN** the entry is skipped and no position is opened for that breakout

#### Scenario: exits are unaffected by the filter
- **WHEN** the regime filter is enabled and a position is open
- **THEN** its exit conditions (channel trail and hard stop) are evaluated
  exactly as when the filter is disabled

### Requirement: SMA warm-up before filtered entries
When the regime filter is enabled, the backtest SHALL NOT open a filtered entry
until at least `smaPeriod` prior closes exist for that symbol.

#### Scenario: no entry before enough history
- **WHEN** the regime filter is enabled and a breakout occurs at a bar index
  with fewer than `smaPeriod` prior closes
- **THEN** the entry is skipped for lack of SMA history

### Requirement: Regime sweep compares horizons against a filter-off baseline
The regime sweep SHALL run the backtest once with the filter off (baseline) and
once per configured SMA horizon with the filter on, holding `atr_multiple`
fixed across all runs, and SHALL report per run the trade count, win rate,
expectancy (R and percent), total P&L, and max drawdown.

#### Scenario: baseline plus one row per horizon
- **WHEN** the regime sweep runs with a configured list of SMA horizons
- **THEN** it produces one filter-off baseline result and one filter-on result
  per horizon, each with trades, win rate, expectancy (R and %), total P&L, and
  max drawdown

#### Scenario: atr_multiple held constant across the sweep
- **WHEN** the regime sweep runs
- **THEN** every run in it uses the same `atr_multiple`, so differences across
  rows reflect the filter and its horizon, not the stop distance

#### Scenario: results persisted
- **WHEN** the regime sweep completes
- **THEN** a JSON file is written under `backtest/results/` containing the
  baseline and per-horizon results, matching the persistence pattern used by
  the other runners

### Requirement: Regime filter default and backward compatibility
The regime filter SHALL default to enabled at a 200-day SMA (adopted based on
the regime sweep). When explicitly disabled, the backtest SHALL produce exactly
the trades it produced before this capability existed.

#### Scenario: default run applies the filter
- **WHEN** `runBacktest` is called without a strategy override
- **THEN** the shipped `config.strategy` applies the regime filter at a 200-day
  SMA

#### Scenario: disabling reproduces prior behavior
- **WHEN** `runBacktest` is called with the regime filter explicitly disabled
- **THEN** the trades produced are identical to those produced before the
  regime filter was added

