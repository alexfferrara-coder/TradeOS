import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sizePosition } from '../backtest/gate.js';

// Plain rules object stands in for loadRiskRules() output. No fixtures needed.
const rules = {
  max_risk_per_trade: 0.01,
  max_position_pct: 0.2,
  max_correlated_positions: 3,
};

describe('sizePosition', () => {
  it('worked example sizes to 100 shares', () => {
    // equity 50k, 1% risk = $500 budget; entry 50 / stop 45 => $5 R.
    // 500 / 5 = 100 shares. Position cap = 50000*0.2/50 = 200, so it
    // does not bind.
    const r = sizePosition({
      entry: 50,
      stopLevel: 45,
      equity: 50000,
      openCount: 0,
      rules,
    });
    assert.equal(r.accepted, true);
    assert.equal(r.shares, 100);
    assert.equal(r.riskPerShare, 5);
  });

  it('20% position cap clamps a tight-stop trade', () => {
    // Tight stop: entry 100 / stop 99.9 => $0.10 R. Risk math wants
    // 500 / 0.1 = 5000 shares, but the cap = 50000*0.2/100 = 100.
    const r = sizePosition({
      entry: 100,
      stopLevel: 99.9,
      equity: 50000,
      openCount: 0,
      rules,
    });
    assert.equal(r.accepted, true);
    assert.equal(r.shares, 100);
    assert.ok(r.shares < 5000, 'clamped below the risk-based share count');
  });

  it('rejects non-positive risk-per-share', () => {
    const r = sizePosition({
      entry: 100,
      stopLevel: 105,
      equity: 50000,
      openCount: 0,
      rules,
    });
    assert.deepEqual(r, { accepted: false, reason: 'non-positive-risk' });
  });

  it('rejects when size rounds below one share', () => {
    // Tiny equity: budget = 100*0.01 = $1, R = $10 => 0 shares.
    const r = sizePosition({
      entry: 50,
      stopLevel: 40,
      equity: 100,
      openCount: 0,
      rules,
    });
    assert.deepEqual(r, { accepted: false, reason: 'size-below-one-share' });
  });

  it('rejects on correlation cap at the limit', () => {
    const r = sizePosition({
      entry: 50,
      stopLevel: 45,
      equity: 50000,
      openCount: 3, // == max_correlated_positions
      rules,
    });
    assert.deepEqual(r, { accepted: false, reason: 'correlation-cap' });
  });

  it('correlation cap is checked before risk math', () => {
    // openCount at the limit AND non-positive risk: the correlation
    // guard runs first (gate.js), so reason must be correlation-cap.
    const r = sizePosition({
      entry: 100,
      stopLevel: 105, // would otherwise be non-positive-risk
      equity: 50000,
      openCount: 3,
      rules,
    });
    assert.equal(r.reason, 'correlation-cap');
  });
});
