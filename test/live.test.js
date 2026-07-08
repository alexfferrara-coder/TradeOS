import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runLive, pickDecisionIndex } from '../backtest/live.js';

const RULES = { max_risk_per_trade: 0.01, max_position_pct: 0.2, max_correlated_positions: 2 };
const NO_FILTER = { regimeFilter: { enabled: false, smaPeriod: 200 } };
const bar = (date, close) => ({ date, open: close, high: close, low: close, close, volume: 1000 });

// A breakout series for one symbol: 20 flat days then a new high, dated so the
// last completed bar is the breakout.
function breakoutBars() {
  const bars = [];
  for (let i = 0; i < 20; i++) bars.push(bar(`2026-06-${String(i + 1).padStart(2, '0')}`, 100));
  bars.push(bar('2026-07-01', 110));
  return bars;
}

// Mock broker: canned account/positions, and per-symbol bars.
function mockBroker({ equity = 50000, positions = [], barsBySymbol = {} }) {
  return {
    submitted: [], // nothing should ever land here
    async getAccount() { return { equity, cash: equity, status: 'ACTIVE' }; },
    async getPositions() { return positions; },
    async getRecentBars(symbol) { return barsBySymbol[symbol] ?? []; },
  };
}

describe('pickDecisionIndex', () => {
  it('drops a partial bar dated today', () => {
    const bars = [bar('2026-06-30', 1), bar('2026-07-02', 2)];
    assert.equal(pickDecisionIndex(bars, '2026-07-02'), 0); // today dropped
  });
  it('uses the last bar when it is already a completed session', () => {
    const bars = [bar('2026-06-30', 1), bar('2026-07-01', 2)];
    assert.equal(pickDecisionIndex(bars, '2026-07-02'), 1);
  });
  it('returns -1 with no bars', () => {
    assert.equal(pickDecisionIndex([], '2026-07-02'), -1);
  });
});

describe('runLive (dry-run)', () => {
  it('flat account reports an ENTER on a breakout and submits nothing', async () => {
    const broker = mockBroker({ barsBySymbol: { NVDA: breakoutBars() } });
    const report = await runLive({
      broker, rules: RULES, strategy: NO_FILTER, symbols: ['NVDA'],
      now: new Date('2026-07-02T12:00:00Z'),
    });
    assert.equal(report.submitted, false);
    assert.equal(report.decisions[0].status, 'ENTER');
    assert.equal(report.decisions[0].shares, 50); // floor(500/10)
    assert.equal(broker.submitted.length, 0);
  });

  it('held position with local stop state reports HOLD when no exit fires', async () => {
    const broker = mockBroker({
      positions: [{ symbol: 'NVDA', qty: 50, avgEntryPrice: 110 }],
      barsBySymbol: { NVDA: breakoutBars() }, // 110 close, well above a stop of 90
    });
    const report = await runLive({
      broker, rules: RULES, strategy: NO_FILTER, symbols: ['NVDA'],
      positionState: { NVDA: { stopLevel: 90, riskPerShare: 10, entryDate: '2026-06-20' } },
      now: new Date('2026-07-02T12:00:00Z'),
    });
    assert.equal(report.heldCount, 1);
    assert.equal(report.decisions[0].status, 'HOLD');
  });

  it('flags a held position that has no local stop state', async () => {
    const broker = mockBroker({
      positions: [{ symbol: 'AAPL', qty: 10, avgEntryPrice: 200 }],
      barsBySymbol: { AAPL: breakoutBars() },
    });
    const report = await runLive({
      broker, rules: RULES, strategy: NO_FILTER, symbols: ['AAPL'],
      now: new Date('2026-07-02T12:00:00Z'),
    });
    assert.deepEqual(report.flagged, ['AAPL']);
    assert.equal(report.decisions[0].status, 'FLAGGED');
  });

  it('reports a SKIP with reason when the regime filter blocks entry', async () => {
    // Old highs drag SMA(30) above a fresh 20-day-high breakout.
    const bars = [];
    for (let i = 0; i < 10; i++) bars.push(bar(`2026-05-${String(i + 1).padStart(2, '0')}`, 200));
    for (let i = 0; i < 20; i++) bars.push(bar(`2026-06-${String(i + 1).padStart(2, '0')}`, 100));
    bars.push(bar('2026-07-01', 105));
    const broker = mockBroker({ barsBySymbol: { BA: bars } });
    const report = await runLive({
      broker, rules: RULES, strategy: { regimeFilter: { enabled: true, smaPeriod: 30 } },
      symbols: ['BA'], now: new Date('2026-07-02T12:00:00Z'),
    });
    assert.equal(report.decisions[0].status, 'SKIP');
    assert.equal(report.decisions[0].detail, 'regime-filtered');
  });
});
