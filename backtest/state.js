// Local strategy-state store. The broker reports positions (symbol, qty, avg
// price) but not OUR entry-time strategy state — stopLevel, riskPerShare,
// entryDate — which the ATR hard stop needs. We persist those here, keyed by
// symbol, and reconcile against the broker's actual positions on each run.

import { existsSync, readFileSync, writeFileSync } from 'fs';

export function loadState(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function saveState(path, state) {
  writeFileSync(path, JSON.stringify(state, null, 2));
}

// Join broker positions with local strategy state. Any broker position lacking
// local state is surfaced in `flagged` rather than silently assigned a stop —
// its exit can't be evaluated correctly until we know its stop level.
export function reconcile(state, positions) {
  const flagged = [];
  const joined = positions.map((p) => {
    const local = state[p.symbol];
    if (!local) {
      flagged.push(p.symbol);
      return { ...p, hasLocalState: false };
    }
    return {
      ...p,
      hasLocalState: true,
      stopLevel: local.stopLevel,
      riskPerShare: local.riskPerShare,
      entryDate: local.entryDate,
    };
  });
  return { positions: joined, flagged };
}
