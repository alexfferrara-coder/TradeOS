// Shared entry/exit decision logic — the single "decision brain" used by both
// the batch backtest (backtest.js) and the live loop (live.js). The harnesses
// differ (batch simulation vs single-day decision against a real account) but
// the judgement is identical, so it lives here once.

import { config } from './config.js';
import { highestClose, lowestClose, smaClose } from './strategy.js';
import { sizePosition } from './gate.js';

// Should an open position exit on bar i? Same for both stop methods: the
// trailing channel low or the fixed hard stop set at entry. `position` carries
// the entry-time `stopLevel`.
export function decideExit({ bars, i, position, cfg = config }) {
  const close = bars[i].close;
  const channelLow = lowestClose(bars, i, cfg.exitLookback); // trails up
  const hitChannel = close < channelLow;
  const hitStop = close <= position.stopLevel; // fixed entry - 1R floor
  if (!hitChannel && !hitStop) return { exit: false };
  // In channel mode channelLow >= stopLevel always, so a channel hit is the
  // binding exit and this label is exact. In atr mode that isn't guaranteed,
  // so when both trip the same day the label is a preference order — the exit
  // price (today's close) is identical either way, so P&L is unaffected.
  return { exit: true, reason: hitChannel ? 'channel' : 'hard-stop' };
}

// Should a flat symbol enter on bar i, and if so at what size/stop? Returns
// either { accepted: true, entry, shares, stopLevel, riskPerShare } or
// { accepted: false, reason, gateRejected }. `gateRejected` is true only for
// risk-gate rejections (correlation cap / risk math), matching what the
// backtest counts as "rejected"; warm-up/no-breakout/filtered are ordinary
// skips. `atrAtEntry` is the precomputed Wilder ATR at i (undefined outside
// atr mode or during ATR warm-up).
export function decideEntry({
  bars,
  i,
  equity,
  openCount,
  rules,
  strategy = config.strategy,
  cfg = config,
  atrAtEntry,
}) {
  const useAtr = rules.stop_method === 'atr';
  const regime = strategy.regimeFilter;
  const useRegime = regime && regime.enabled;

  if (i < cfg.entryLookback) return { accepted: false, reason: 'warmup', gateRejected: false };
  if (useAtr && atrAtEntry === undefined)
    return { accepted: false, reason: 'atr-warmup', gateRejected: false };
  if (useRegime && i < regime.smaPeriod)
    return { accepted: false, reason: 'regime-warmup', gateRejected: false };

  const close = bars[i].close;

  if (!(close > highestClose(bars, i, cfg.entryLookback)))
    return { accepted: false, reason: 'no-breakout', gateRejected: false };

  // Regime filter: only take the breakout in an uptrend (close above its
  // long-term SMA). Entry-only; exits are untouched.
  if (useRegime && close <= smaClose(bars, i, regime.smaPeriod))
    return { accepted: false, reason: 'regime-filtered', gateRejected: false };

  // Risk-per-share source depends on stop_method; sizing (gate.js) doesn't
  // care which produced it.
  const stopLevel = useAtr
    ? close - rules.atr_multiple * atrAtEntry
    : lowestClose(bars, i, cfg.exitLookback); // entry - 1R (channel mode)

  const decision = sizePosition({ entry: close, stopLevel, equity, openCount, rules });
  if (!decision.accepted) return { accepted: false, reason: decision.reason, gateRejected: true };

  return {
    accepted: true,
    entry: close,
    shares: decision.shares,
    stopLevel,
    riskPerShare: decision.riskPerShare,
  };
}
