// Backtest configuration. Rule numbers (risk %, position %, correlation cap)
// are NOT here on purpose — those come only from loadRiskRules.js via gate.js.

export const config = {
  // Universe. NOTE: survivorship-biased toward known winners (see README).
  symbols: ['SPY', 'AAPL', 'MSFT', 'NVDA', 'JPM'],

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
};
