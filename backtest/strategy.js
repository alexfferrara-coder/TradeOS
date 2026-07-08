// Fixed Donchian 20/10 condition. Do not "improve" the rule.
//   Entry: today's close > highest close of the prior 20 days.
//   Exit:  today's close < lowest close of the prior 10 days, OR
//          close <= hard stop at 1x entry risk — whichever first.
//
// "Prior N days" means indices [i-lookback, i-1] — today (i) is excluded.

export function highestClose(bars, i, lookback) {
  let h = -Infinity;
  for (let j = i - lookback; j < i; j++) {
    if (bars[j].close > h) h = bars[j].close;
  }
  return h;
}

export function lowestClose(bars, i, lookback) {
  let l = Infinity;
  for (let j = i - lookback; j < i; j++) {
    if (bars[j].close < l) l = bars[j].close;
  }
  return l;
}

// Simple moving average of the prior `period` closes, same "prior N days,
// today excluded" convention as highestClose/lowestClose. Stateless — a plain
// window mean, recomputed per call (no precompute needed, unlike ATR).
// Callers must ensure i >= period so the full window exists.
export function smaClose(bars, i, period) {
  let sum = 0;
  for (let j = i - period; j < i; j++) sum += bars[j].close;
  return sum / period;
}
