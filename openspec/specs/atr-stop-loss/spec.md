# atr-stop-loss Specification

## Purpose
TBD - created by archiving change add-atr-stop-and-sweep. Update Purpose after archive.
## Requirements
### Requirement: Stop method configuration
The risk rules loader SHALL read `stop_method`, `atr_period`, and
`atr_multiple` from the risk-rules frontmatter, defaulting `stop_method` to
`channel` when the field is absent, and SHALL validate `atr_period` and
`atr_multiple` whenever `stop_method` is `atr`.

#### Scenario: stop_method absent defaults to channel
- **WHEN** the risk-rules frontmatter has no `stop_method` field
- **THEN** the loader returns `stop_method: 'channel'` and does not require
  `atr_period` or `atr_multiple` to be present

#### Scenario: atr mode missing required fields
- **WHEN** `stop_method` is `atr` and `atr_period` or `atr_multiple` is
  missing, null, or undefined
- **THEN** the loader throws an error identifying the missing field

#### Scenario: unrecognized stop_method value
- **WHEN** `stop_method` is present and is neither `atr` nor `channel`
- **THEN** the loader throws an error

#### Scenario: atr_period not a positive integer
- **WHEN** `stop_method` is `atr` and `atr_period` is not a positive integer
- **THEN** the loader throws an error

#### Scenario: atr_multiple not a positive number
- **WHEN** `stop_method` is `atr` and `atr_multiple` is not a number greater
  than zero
- **THEN** the loader throws an error

#### Scenario: valid atr configuration loads successfully
- **WHEN** `stop_method` is `atr` with a valid positive-integer `atr_period`
  and a valid positive-number `atr_multiple`
- **THEN** the loader returns `stop_method`, `atr_period`, and
  `atr_multiple` alongside the existing `max_risk_per_trade`,
  `max_position_pct`, and `max_correlated_positions` fields

### Requirement: ATR-derived risk-per-share
When the loaded rules specify `stop_method: atr`, the backtest SHALL derive
an accepted entry's stop level from the Wilder average true range at the
entry index (`entry_close - atr_multiple * ATR(atr_period)`), independent of
the Donchian exit channel. When `stop_method` is `channel` or absent, the
backtest SHALL derive the stop level from the prior `exitLookback`-day low,
exactly as before this change.

#### Scenario: entry stop level in atr mode
- **WHEN** a Donchian entry triggers and the loaded rules have
  `stop_method: atr`
- **THEN** the position's stop level is
  `entryClose - (atr_multiple * ATR(atr_period) at the entry index)`

#### Scenario: entry stop level in channel mode
- **WHEN** a Donchian entry triggers and the loaded rules have
  `stop_method: channel` (or omit `stop_method`)
- **THEN** the position's stop level is the prior `exitLookback`-day low, as
  computed today

### Requirement: Stop-method-agnostic position sizing
The position-sizing gate SHALL size a position using the same formula
(risk-dollars ÷ risk-per-share, capped by `max_position_pct`) regardless of
whether the supplied stop level was derived from the ATR or the channel.

#### Scenario: sizing an ATR-derived stop
- **WHEN** `sizePosition` receives a `stopLevel` computed from ATR
- **THEN** it computes `riskPerShare = entry - stopLevel` and sizes shares
  using the same `max_risk_per_trade` / `max_position_pct` formula it uses
  for a channel-derived `stopLevel`

### Requirement: Risk-per-trade ceiling unaffected by stop method
The risk rules loader SHALL enforce the existing `max_risk_per_trade` ceiling
(0.1 maximum) identically regardless of `stop_method`, and this change SHALL
NOT introduce any way to configure, raise, or bypass that ceiling.

#### Scenario: ceiling still enforced in atr mode
- **WHEN** `stop_method` is `atr` and `max_risk_per_trade` exceeds `0.1`
- **THEN** the loader throws, exactly as it does today for channel mode

