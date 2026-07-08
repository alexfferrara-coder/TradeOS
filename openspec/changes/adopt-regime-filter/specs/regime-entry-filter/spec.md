## MODIFIED Requirements

### Requirement: Filter is enabled by default and disabling preserves prior behavior
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
