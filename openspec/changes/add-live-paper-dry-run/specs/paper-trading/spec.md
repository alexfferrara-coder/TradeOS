## ADDED Requirements

### Requirement: Shared decision logic across backtest and live
The entry and exit decision logic SHALL be a single shared implementation used
by both the backtest and the live loop, so that a given bar and state produce
the same decision in either harness.

#### Scenario: backtest behavior unchanged after extraction
- **WHEN** the shared decision functions are extracted and `runBacktest` is
  rewired to call them
- **THEN** the backtest produces the same trades it produced before the
  extraction

#### Scenario: live uses the same decision functions
- **WHEN** the live loop evaluates a symbol on a bar
- **THEN** it uses the same shared `decideEntry`/`decideExit` logic the backtest
  uses, not a separate copy

### Requirement: Dry-run loop submits no orders
The v1 live loop SHALL be dry-run only: it SHALL compute and report intended
orders but SHALL NOT submit any order, and SHALL contain no order-submission
code path.

#### Scenario: no submission on any decision
- **WHEN** the live loop decides to enter or exit a position
- **THEN** it reports the intended order and submits nothing to the broker

### Requirement: Fail-closed risk gate before acting
The live loop SHALL load the risk rules before anything else and refuse to run
if they do not load or validate, exactly as the backtest runner does.

#### Scenario: refuses to run on invalid rules
- **WHEN** the risk rules fail to load or validate
- **THEN** the live loop exits with an error and produces no decisions

### Requirement: Decide on the last completed bar
The live loop SHALL make decisions using the most recent completed daily bar,
never a partial in-progress bar, and SHALL state the decision date.

#### Scenario: partial current-session bar is not used
- **WHEN** the loop runs while the current session's daily bar is still forming
- **THEN** it decides on the last completed session and labels that date,
  warning that the market is open

### Requirement: Read paper account state
The live loop SHALL read account equity and open positions from the Alpaca
paper endpoint, and SHALL reconcile broker positions against the local
per-position strategy-state store.

#### Scenario: broker position missing local state is flagged
- **WHEN** the broker reports an open position for which no local strategy
  state (stop level, risk per share) exists
- **THEN** the loop flags it rather than silently assuming a stop level

### Requirement: Decisions report is produced and persisted
The live loop SHALL print a per-symbol decisions report (enter with size and
stop, exit with reason, hold, or filtered/no-signal) and persist it as JSON for
later inspection.

#### Scenario: report covers every configured symbol
- **WHEN** the loop completes a run
- **THEN** it emits a decision for each configured symbol and writes the run to
  a JSON file
