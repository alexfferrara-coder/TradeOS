import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../backtest/stats.js';

const trade = (pnl, overrides = {}) => ({
  pnl,
  retPct: 0,
  rMultiple: 0,
  ...overrides,
});

describe('summarize', () => {
  it('empty trade list has zero drawdown', () => {
    const s = summarize([], 50000);
    assert.equal(s.n, 0);
    assert.equal(s.maxDrawdownUsd, 0);
    assert.equal(s.maxDrawdownPct, 0);
  });

  it('all-winning sequence has zero drawdown', () => {
    const trades = [trade(1000), trade(500), trade(2000)];
    const s = summarize(trades, 50000);
    assert.equal(s.maxDrawdownUsd, 0);
    assert.equal(s.maxDrawdownPct, 0);
  });

  it('computes the exact peak-to-trough decline', () => {
    // 50000 -> 60000 (peak) -> 45000 (trough, -15000/-25%) -> 48000 (partial recovery)
    const trades = [trade(10000), trade(-15000), trade(3000)];
    const s = summarize(trades, 50000);
    assert.equal(s.maxDrawdownUsd, 15000);
    assert.ok(Math.abs(s.maxDrawdownPct - 15000 / 60000) < 1e-9);
  });

  it('finds the largest of multiple drawdowns, not just the last', () => {
    // 50000 -> 40000 (dd 10000/20%) -> 80000 (new peak) -> 73000 (dd 7000, smaller %)
    const trades = [trade(-10000), trade(40000), trade(-7000)];
    const s = summarize(trades, 50000);
    assert.equal(s.maxDrawdownUsd, 10000);
    assert.ok(Math.abs(s.maxDrawdownPct - 10000 / 50000) < 1e-9);
  });
});
