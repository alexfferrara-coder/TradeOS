// Summary statistics from the closed-trade log.

export function summarize(trades) {
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
  };
}
