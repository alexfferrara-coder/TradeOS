// Portfolio-level simulation. A single date axis is required because the
// correlation cap is flat/portfolio-wide (B) and equity is shared across
// symbols. Each day: process exits first (frees slots), then entries.

import { config } from './config.js';
import { atrSeries } from './atr.js';
import { decideEntry, decideExit } from './decide.js';

// `strategy` (regime filter etc.) is injected so the regime sweep can vary it
// per run; it defaults to config.strategy so existing two-arg callers are
// unaffected. The per-day entry/exit judgement lives in decide.js and is
// shared with the live loop; this function only orchestrates the portfolio
// (date axis, shared equity, exits-then-entries phasing) around it.
export function runBacktest(barsBySymbol, rules, strategy = config.strategy) {
  const { startEquity, costBps } = config;
  const slip = costBps / 10000;
  const useAtr = rules.stop_method === 'atr';

  // Per-symbol date -> index lookup, and the union of all trading dates.
  // atrBySymbol is only populated (and only consulted) in atr mode — Wilder
  // ATR is sequential/stateful, so it's precomputed once per symbol here
  // rather than recomputed per lookup the way highestClose/lowestClose are.
  const idx = {};
  const atrBySymbol = {};
  const allDates = new Set();
  for (const [sym, bars] of Object.entries(barsBySymbol)) {
    idx[sym] = new Map(bars.map((b, i) => [b.date, i]));
    if (useAtr) atrBySymbol[sym] = atrSeries(bars, rules.atr_period);
    for (const b of bars) allDates.add(b.date);
  }
  const dates = [...allDates].sort();

  let equity = startEquity;
  const open = new Map(); // symbol -> open position
  const trades = [];
  let rejected = 0;

  for (const date of dates) {
    // 1) Exits — both the trailing channel low and the fixed hard stop.
    for (const [sym, pos] of [...open.entries()]) {
      const i = idx[sym].get(date);
      if (i === undefined) continue;
      const bars = barsBySymbol[sym];

      const { exit, reason } = decideExit({ bars, i, position: pos });
      if (!exit) continue;

      const close = bars[i].close;
      const exitPx = close * (1 - slip);
      const pnl = (exitPx - pos.entryPx) * pos.shares;
      equity += pnl;
      trades.push({
        symbol: sym,
        entryDate: pos.entryDate,
        entryPx: pos.entryPx,
        exitDate: date,
        exitPx,
        reason,
        shares: pos.shares,
        rMultiple: (exitPx - pos.entryPx) / pos.riskPerShare,
        retPct: (exitPx - pos.entryPx) / pos.entryPx,
        pnl,
      });
      open.delete(sym);
    }

    // 2) Entries — 20-day high breakout, then through the risk gate.
    for (const sym of config.symbols) {
      if (open.has(sym)) continue; // one position per symbol, no pyramiding
      const i = idx[sym].get(date);
      if (i === undefined) continue; // no bar for this symbol on this date
      const bars = barsBySymbol[sym];

      const decision = decideEntry({
        bars,
        i,
        equity,
        openCount: open.size,
        rules,
        strategy,
        atrAtEntry: useAtr ? atrBySymbol[sym][i] : undefined,
      });
      if (!decision.accepted) {
        if (decision.gateRejected) rejected++;
        continue;
      }

      open.set(sym, {
        symbol: sym,
        entryDate: date,
        entryPx: decision.entry * (1 + slip),
        shares: decision.shares,
        stopLevel: decision.stopLevel,
        riskPerShare: decision.riskPerShare,
      });
    }
  }

  return { trades, rejected, finalEquity: equity, openAtEnd: [...open.keys()] };
}
