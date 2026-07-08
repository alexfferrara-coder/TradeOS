// Backtest configuration. Rule numbers (risk %, position %, correlation cap)
// are NOT here on purpose — those come only from loadRiskRules.js via gate.js.

export const config = {
  // Universe. De-biased: the original five winners plus eleven names with
  // real, sustained drawdowns spread across failure modes (see README).
  symbols: [
    'SPY', 'AAPL', 'MSFT', 'NVDA', 'JPM',
    'BA', 'INTC', 'WBA', 'PYPL', 'NFLX', 'DIS', 'F', 'META', 'ROKU', 'T', 'NKE',
  ],

  // Historical window (daily bars).
  start: '2019-01-01',
  end: '2024-12-31',

  // Alpaca data feed: 'iex' (free) or 'sip' (paid, full coverage).
  feed: 'sip',

  // Account / sizing inputs (limits themselves come from the risk gate).
  startEquity: 50000,

  // Per-side cost (spread + slippage) in basis points. ~5 bps is a
  // deliberately slightly-pessimistic estimate for liquid large-caps.
  costBps: 5,

  // Fixed Donchian lookbacks — do not change the strategy condition.
  entryLookback: 20, // entry: close > highest close of prior 20 days
  exitLookback: 10,  // exit: close < lowest close of prior 10 days; also sets 1R

  // On-disk cache for fetched bars (gitignored).
  dataDir: new URL('./data/', import.meta.url),

  // Strategy-level (not risk) parameters. Injected into runBacktest so the
  // regime sweep can vary them per run; risk limits stay in the risk gate.
  strategy: {
    // Regime entry filter: when enabled, a long breakout is taken only if the
    // close is above its prior-`smaPeriod` SMA. Default OFF — off reproduces
    // the pre-filter behavior exactly.
    regimeFilter: { enabled: false, smaPeriod: 200 },
  },

  // Sweep ranges. Each sweep varies ONE parameter and holds the rest fixed.
  //   atrMultiples     — for `node backtest/sweep.js` (atr_period & lookbacks fixed)
  //   regimeSmaPeriods — for `node backtest/regime-sweep.js` (atr_multiple fixed)
  sweep: {
    atrMultiples: [1.5, 2.0, 2.5, 3.0, 3.5],
    regimeSmaPeriods: [50, 100, 150, 200],
  },
};
