import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decideEntry, decideExit } from '../backtest/decide.js';

const cfg = { entryLookback: 20, exitLookback: 10 };
const RULES = { max_risk_per_trade: 0.01, max_position_pct: 0.2, max_correlated_positions: 2 };
const NO_FILTER = { regimeFilter: { enabled: false, smaPeriod: 200 } };
const bars = (closes) => closes.map((close) => ({ close, high: close, low: close }));

describe('decideEntry', () => {
  it('accepts a breakout and sizes it', () => {
    // 20 closes of 100, then a breakout to 110. stop = prior-10 low = 100.
    const series = bars([...Array(20).fill(100), 110]);
    const d = decideEntry({
      bars: series, i: 20, equity: 50000, openCount: 0,
      rules: RULES, strategy: NO_FILTER, cfg,
    });
    assert.equal(d.accepted, true);
    assert.equal(d.entry, 110);
    assert.equal(d.stopLevel, 100);
    assert.equal(d.shares, 50); // floor(500 / 10)
  });

  it('skips when there is no breakout', () => {
    const series = bars([...Array(20).fill(100), 100]);
    const d = decideEntry({
      bars: series, i: 20, equity: 50000, openCount: 0,
      rules: RULES, strategy: NO_FILTER, cfg,
    });
    assert.equal(d.accepted, false);
    assert.equal(d.reason, 'no-breakout');
    assert.equal(d.gateRejected, false);
  });

  it('filters a below-SMA breakout when the regime filter is on', () => {
    // Old highs (200) drag the 30-day SMA above a fresh 20-day-high of 105.
    const series = bars([...Array(10).fill(200), ...Array(20).fill(100), 105]);
    const d = decideEntry({
      bars: series, i: 30, equity: 50000, openCount: 0,
      rules: RULES, strategy: { regimeFilter: { enabled: true, smaPeriod: 30 } }, cfg,
    });
    assert.equal(d.accepted, false);
    assert.equal(d.reason, 'regime-filtered');
    assert.equal(d.gateRejected, false);
  });

  it('flags a gate rejection distinctly from a plain skip', () => {
    // Breakout, but correlation cap is full → gate rejection.
    const series = bars([...Array(20).fill(100), 110]);
    const d = decideEntry({
      bars: series, i: 20, equity: 50000, openCount: 2, // == max_correlated_positions
      rules: RULES, strategy: NO_FILTER, cfg,
    });
    assert.equal(d.accepted, false);
    assert.equal(d.reason, 'correlation-cap');
    assert.equal(d.gateRejected, true);
  });
});

describe('decideExit', () => {
  it('exits on a channel breach', () => {
    // prior-10 low is 100; a close of 95 breaches it.
    const series = bars([...Array(10).fill(100), 95]);
    const d = decideExit({ bars: series, i: 10, position: { stopLevel: 50 }, cfg });
    assert.equal(d.exit, true);
    assert.equal(d.reason, 'channel');
  });

  it('exits on the hard stop when the channel is not breached', () => {
    // prior-10 low is 90 (not breached by 95), but stopLevel 96 is hit.
    const series = bars([...Array(10).fill(90), 95]);
    const d = decideExit({ bars: series, i: 10, position: { stopLevel: 96 }, cfg });
    assert.equal(d.exit, true);
    assert.equal(d.reason, 'hard-stop');
  });

  it('holds when neither trigger fires', () => {
    const series = bars([...Array(10).fill(90), 120]);
    const d = decideExit({ bars: series, i: 10, position: { stopLevel: 80 }, cfg });
    assert.equal(d.exit, false);
  });
});
