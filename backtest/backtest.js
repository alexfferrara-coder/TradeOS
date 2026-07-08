// Portfolio-level simulation. A single date axis is required because the
// correlation cap is flat/portfolio-wide (B) and equity is shared across
// symbols. Each day: process exits first (frees slots), then entries.

import { config } from './config.js';
import { highestClose, lowestClose } from './strategy.js';
import { sizePosition } from './gate.js';

export function runBacktest(barsBySymbol, rules) {
  const { entryLookback, exitLookback, startEquity, costBps } = config;
  const slip = costBps / 10000;

  // Per-symbol date -> index lookup, and the union of all trading dates.
  const idx = {};
  const allDates = new Set();
  for (const [sym, bars] of Object.entries(barsBySymbol)) {
    idx[sym] = new Map(bars.map((b, i) => [b.date, i]));
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
      const close = bars[i].close;

      const channelLow = lowestClose(bars, i, exitLookback); // trails up
      const hitChannel = close < channelLow;
      const hitStop = close <= pos.stopLevel; // fixed entry - 1R floor

      if (hitChannel || hitStop) {
        // channelLow >= stopLevel always, so a channel hit is the higher
        // (binding/first) exit; otherwise it's the hard stop.
        const reason = hitChannel ? 'channel' : 'hard-stop';
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
    }

    // 2) Entries — 20-day high breakout, then through the risk gate.
    for (const sym of config.symbols) {
      if (open.has(sym)) continue; // one position per symbol, no pyramiding
      const i = idx[sym].get(date);
      if (i === undefined || i < entryLookback) continue; // warm-up
      const bars = barsBySymbol[sym];
      const close = bars[i].close;

      if (!(close > highestClose(bars, i, entryLookback))) continue;

      const stopLevel = lowestClose(bars, i, exitLookback); // entry - 1R
      const decision = sizePosition({
        entry: close,
        stopLevel,
        equity,
        openCount: open.size,
        rules,
      });
      if (!decision.accepted) {
        rejected++;
        continue;
      }

      open.set(sym, {
        symbol: sym,
        entryDate: date,
        entryPx: close * (1 + slip),
        shares: decision.shares,
        stopLevel,
        riskPerShare: decision.riskPerShare,
      });
    }
  }

  return { trades, rejected, finalEquity: equity, openAtEnd: [...open.keys()] };
}
