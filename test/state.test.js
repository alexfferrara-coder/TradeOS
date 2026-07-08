import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadState, saveState, reconcile } from '../backtest/state.js';

let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'tradeos-state-')); });
after(() => { rmSync(dir, { recursive: true, force: true }); });

describe('state store', () => {
  it('loads {} when the file does not exist', () => {
    assert.deepEqual(loadState(join(dir, 'missing.json')), {});
  });

  it('round-trips save then load', () => {
    const path = join(dir, 'positions.json');
    const state = { NVDA: { stopLevel: 118.4, riskPerShare: 6.2, entryDate: '2026-07-01' } };
    saveState(path, state);
    assert.deepEqual(loadState(path), state);
  });

  it('reconcile joins local state onto broker positions', () => {
    const state = { NVDA: { stopLevel: 118.4, riskPerShare: 6.2, entryDate: '2026-07-01' } };
    const positions = [{ symbol: 'NVDA', qty: 38, avgEntryPrice: 120.5 }];
    const { positions: joined, flagged } = reconcile(state, positions);
    assert.equal(flagged.length, 0);
    assert.equal(joined[0].stopLevel, 118.4);
    assert.equal(joined[0].hasLocalState, true);
  });

  it('flags a broker position with no local state', () => {
    const positions = [{ symbol: 'AAPL', qty: 10, avgEntryPrice: 200 }];
    const { positions: joined, flagged } = reconcile({}, positions);
    assert.deepEqual(flagged, ['AAPL']);
    assert.equal(joined[0].hasLocalState, false);
  });
});
