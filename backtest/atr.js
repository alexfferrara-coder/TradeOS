// Wilder's average true range. Sequential/stateful (each value depends on
// the one before it) so it's computed once per symbol as a full series,
// unlike strategy.js's highestClose/lowestClose which are cheap to
// recompute per call from a small fixed window.

function trueRange(bars, i) {
  const { high, low } = bars[i];
  if (i === 0) return high - low;
  const prevClose = bars[i - 1].close;
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

// Returns an array the same length as `bars`. Indices before the
// atr_period'th bar are `undefined` (not enough history to seed the
// average yet) — same warm-up shape as strategy.js's lookback guards.
export function atrSeries(bars, atr_period) {
  const series = new Array(bars.length).fill(undefined);
  if (bars.length < atr_period) return series;

  let sum = 0;
  for (let i = 0; i < atr_period; i++) sum += trueRange(bars, i);
  let atr = sum / atr_period;
  series[atr_period - 1] = atr;

  for (let i = atr_period; i < bars.length; i++) {
    atr = (atr * (atr_period - 1) + trueRange(bars, i)) / atr_period;
    series[i] = atr;
  }

  return series;
}
