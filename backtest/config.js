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

  // Default atr_multiple range for `node backtest/sweep.js`. atr_period and
  // the Donchian lookbacks above are held fixed across every sweep run —
  // only atr_multiple varies. Override with a CLI arg list if needed later;
  // this is just the starting default.
  sweep: {
    atrMultiples: [1.5, 2.0, 2.5, 3.0, 3.5],
  },
};
