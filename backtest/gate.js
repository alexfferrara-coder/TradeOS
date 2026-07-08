// The ONLY consumer of the risk rules in the backtest. All limits come from
// loadRiskRules.js (imported in run.js and passed in as `rules`). No rule
// numbers are hardcoded here.

// Decide whether a proposed entry is allowed and, if so, how many shares.
//   entry      - proposed entry price (close that triggered the breakout)
//   stopLevel  - prior-10-day low at entry == entry - 1R
//   equity     - current account equity
//   openCount  - number of positions currently open (flat portfolio-wide)
//   rules      - object from loadRiskRules(): { max_risk_per_trade,
//                max_position_pct, max_correlated_positions }
export function sizePosition({ entry, stopLevel, equity, openCount, rules }) {
  // Flat portfolio-wide concurrent cap. v1 simplification of the
  // "max correlated positions" rule (see README): treats every open position
  // as correlated rather than grouping by sector.
  if (openCount >= rules.max_correlated_positions) {
    return { accepted: false, reason: 'correlation-cap' };
  }

  const riskPerShare = entry - stopLevel; // = 1R
  if (riskPerShare <= 0) {
    return { accepted: false, reason: 'non-positive-risk' };
  }

  // size = (equity * max_risk_per_trade) / risk-per-share
  const riskDollars = equity * rules.max_risk_per_trade;
  let shares = Math.floor(riskDollars / riskPerShare);

  // Cap exposure at max_position_pct of equity, even if the stop is tight.
  const maxShares = Math.floor((equity * rules.max_position_pct) / entry);
  if (shares > maxShares) shares = maxShares;

  if (shares < 1) {
    return { accepted: false, reason: 'size-below-one-share' };
  }

  return { accepted: true, shares, riskPerShare, stopLevel };
}
