## ADDED Requirements

### Requirement: De-biased symbol universe
The backtest symbol universe SHALL include instruments with documented,
sustained drawdowns over the configured backtest window, spanning multiple
distinct failure modes, so that loss-avoidance logic can be evaluated on both
its cost (entries it forgoes) and its benefit (downtrends it avoids). The
universe SHALL NOT consist solely of instruments that trended up over the
window.

#### Scenario: universe contains real losers
- **WHEN** the configured universe is inspected
- **THEN** it includes instruments that experienced sustained drawdowns during
  the backtest window (e.g. secular decliners, idiosyncratic disasters, and
  growth names that crashed), not only instruments that appreciated

#### Scenario: failure modes are varied
- **WHEN** the added instruments are considered as a set
- **THEN** they span more than one failure archetype (for example: secular
  decline, one-off disaster, growth crash that stayed down, and growth crash
  that recovered), rather than a single kind of loss

### Requirement: Universe change does not alter simulation logic
Expanding the universe SHALL NOT change the entry/exit strategy, the risk gate,
the ATR stop calculation, or the sweep logic — the simulation SHALL treat the
universe purely as input and produce the same per-symbol results it would have
for any symbol previously configured.

#### Scenario: existing symbols behave identically
- **WHEN** the backtest is run after the universe is expanded
- **THEN** the trades produced for the originally configured symbols are
  unchanged from before the expansion (the added symbols only add their own
  trades and their own contention for portfolio slots)

### Requirement: Honest re-sweep after expansion
After the universe is expanded, the `atr_multiple` sweep SHALL be re-run on the
expanded universe to produce a de-biased comparison, and any decision on the
`atr_multiple` value SHALL be based on that de-biased comparison rather than on
results from the survivorship-biased universe.

#### Scenario: sweep reflects the expanded universe
- **WHEN** the sweep is run after the universe is expanded
- **THEN** its per-multiple results reflect all configured symbols, including
  the added losers
