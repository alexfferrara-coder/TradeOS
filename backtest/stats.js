// Summary statistics from the closed-trade log.

// Max drawdown from a starting equity and a chronologically ordered list of
// closed trades: walk the running-equity curve (startEquity + cumulative
// pnl), tracking the running peak, and take the largest peak-to-trough
// decline. Returns zero for an empty list or a curve that never declines
// from its running peak.
function maxDrawdown(trades, startEquity) {
  let equity = startEquity;
  let peak = startEquity;
  let maxDrawdownUsd = 0;
  let maxDrawdownPct = 0;

  for (const t of trades) {
    equity += t.pnl;
    if (equity > peak) peak = equity;
    const drawdownUsd = peak - equity;
    if (drawdownUsd > maxDrawdownUsd) maxDrawdownUsd = drawdownUsd;
    const drawdownPct = peak > 0 ? drawdownUsd / peak : 0;
    if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;
  }

  return { maxDrawdownPct, maxDrawdownUsd };
}

export function summarize(trades, startEquity) {
  const n = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = n ? wins.length / n : 0;

  const meanRet = (arr) =>
    arr.length ? arr.reduce((a, t) => a + t.retPct, 0) / arr.length : 0;
  const meanR = (arr) =>
    arr.length ? arr.reduce((a, t) => a + t.rMultiple, 0) / arr.length : 0;

  const avgWin = meanRet(wins);
  const avgLoss = meanRet(losses);

  // Expectancy per trade: win% * avgWin + loss% * avgLoss.
  const expectancyPct = winRate * avgWin + (1 - winRate) * avgLoss;
  const expectancyR = meanR(trades);

  return {
    n,
    winRate,
    avgWin,
    avgLoss,
    avgWinR: meanR(wins),
    avgLossR: meanR(losses),
    expectancyPct,
    expectancyR,
    totalPnl: trades.reduce((a, t) => a + t.pnl, 0),
    ...maxDrawdown(trades, startEquity),
  };
}
