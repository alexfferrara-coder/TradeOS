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
