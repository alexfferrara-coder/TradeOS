import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { atrSeries } from '../backtest/atr.js';

// Hand-computed against Wilder's ATR:
//   TR[0] = high-low (no prior close)
//   TR[i] = max(high-low, |high-prevClose|, |low-prevClose|)
//   seed  = mean(TR[0..period-1])
//   ATR[i] = (ATR[i-1]*(period-1) + TR[i]) / period
const bars = [
  { high: 10, low: 8, close: 9 },     // TR0 = 2
  { high: 12, low: 9, close: 11 },    // TR1 = max(3, 3, 0) = 3
  { high: 11, low: 9, close: 10 },    // TR2 = max(2, 0, 2) = 2
  { high: 13, low: 10, close: 12 },   // TR3 = max(3, 3, 0) = 3
  { high: 12, low: 11, close: 11.5 }, // TR4 = max(1, 0, 1) = 1
];

const closeTo = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );

describe('atrSeries', () => {
  it('undefined before the seed index', () => {
    const series = atrSeries(bars, 3);
    assert.equal(series[0], undefined);
    assert.equal(series[1], undefined);
  });

  it('seeds at index period-1 as the simple mean of the first period TRs', () => {
    const series = atrSeries(bars, 3);
    closeTo(series[2], (2 + 3 + 2) / 3); // 7/3
  });

  it('smooths subsequent values with Wilder\'s recurrence', () => {
    const series = atrSeries(bars, 3);
    const seed = (2 + 3 + 2) / 3;
    const atr3 = (seed * 2 + 3) / 3;
    const atr4 = (atr3 * 2 + 1) / 3;
    closeTo(series[3], atr3);
    closeTo(series[4], atr4);
  });

  it('returns an all-undefined series when bars are shorter than the period', () => {
    const series = atrSeries(bars.slice(0, 2), 3);
    assert.deepEqual(series, [undefined, undefined]);
  });
});
