import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { smaClose } from '../backtest/strategy.js';

const bars = [10, 20, 30, 40, 50].map((close) => ({ close }));

describe('smaClose', () => {
  it('averages the prior `period` closes, excluding today', () => {
    // i=3, period=3 => closes[0..2] = (10+20+30)/3 = 20 (today, 40, excluded)
    assert.equal(smaClose(bars, 3, 3), 20);
  });

  it('window slides with i', () => {
    // i=4, period=3 => closes[1..3] = (20+30+40)/3 = 30
    assert.equal(smaClose(bars, 4, 3), 30);
  });

  it('period 1 is just the prior close', () => {
    // i=4, period=1 => closes[3] = 40
    assert.equal(smaClose(bars, 4, 1), 40);
  });

  it('uses exactly the window ending just before i', () => {
    // i=4, period=4 => closes[0..3] = (10+20+30+40)/4 = 25
    assert.equal(smaClose(bars, 4, 4), 25);
  });
});
