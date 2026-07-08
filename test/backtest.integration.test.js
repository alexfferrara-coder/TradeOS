import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBacktest } from '../backtest/backtest.js';
import { config } from '../backtest/config.js';

// runBacktest reads the module-level config (symbols, 20/10 lookbacks,
// startEquity, costBps) — it does NOT accept a config arg. So we isolate one
// symbol by using SPY (a real config symbol) as the carrier and stubbing the
// other config.symbols as empty arrays (skipped safely by the entries loop).
const CARRIER = 'SPY';

const bar = (date, close) => ({ date, open: close, high: close, low: close, close, volume: 1_000_000 });
const dayISO = (offset) => new Date(Date.UTC(2020, 0, 1 + offset)).toISOString().slice(0, 10);

// --- Hand-built series: exactly one trade. entryLookback=20, exitLookback=10.
//   bars 0..19  close=100   warm-up (prior-20 high = 100)
//   bar  20     close=110   > 100  => BREAKOUT ENTRY   date 2020-01-21
//                            stop = prior-10 low = 100  => R = 110-100 = $10/sh
//                            size = floor(50000*0.01/10) = 50 sh (cap 90, no bind)
//   bars 21..30 close=130   held (prior-10 low stays <=110, no exit)
//   bar  31     close=125   < prior-10 low(=130) => CHANNEL EXIT  date 2020-02-01
//   bars 32..39 close=120   < prior-20 high(=130) => no re-entry
//
// Fills with costBps=5 (slip=0.0005): entry 110*(1.0005)=110.055,
//   exit 125*(0.9995)=124.9375  =>  R = (124.9375-110.055)/10 ≈ 1.48825
function buildSeries() {
  const bars = [];
  for (let i = 0; i < 20; i++) bars.push(bar(dayISO(i), 100));
  bars.push(bar(dayISO(20), 110));
  for (let i = 21; i <= 30; i++) bars.push(bar(dayISO(i), 130));
  bars.push(bar(dayISO(31), 125));
  for (let i = 32; i <= 39; i++) bars.push(bar(dayISO(i), 120));
  return bars;
}

const RULES = { max_risk_per_trade: 0.01, max_position_pct: 0.2, max_correlated_positions: 2 };

// SPY as carrier + empty stubs for the remaining config.symbols.
function isolate(bars) {
  const bySymbol = { [CARRIER]: bars };
  for (const s of config.symbols) if (!(s in bySymbol)) bySymbol[s] = [];
  return bySymbol;
}

describe('runBacktest (integration)', () => {
  assert.ok(config.symbols.includes(CARRIER), 'carrier must be in config.symbols');

  it('produces the one hand-calculated trade with correct dates and R', () => {
    const bars = buildSeries();
    const { trades } = runBacktest(isolate(bars), RULES);

    const slip = config.costBps / 10000;
    const expEntry = 110 * (1 + slip);
    const expExit = 125 * (1 - slip);
    const expR = (expExit - expEntry) / (110 - 100); // riskPerShare = 10

    assert.equal(trades.length, 1);
    const t = trades[0];
    assert.equal(t.symbol, CARRIER);
    assert.equal(t.entryDate, dayISO(20)); // 2020-01-21
    assert.equal(t.exitDate, dayISO(31));  // 2020-02-01
    assert.equal(t.reason, 'channel');
    assert.ok(Math.abs(t.rMultiple - expR) < 1e-9, `R ${t.rMultiple} vs ${expR}`);
  });

  it('has no look-ahead: a truncated run is a prefix of the full run', () => {
    const full = buildSeries();
    const truncated = full.slice(0, 34); // genuine prefix, still contains the full trade

    const fullTrades = runBacktest(isolate(full), RULES).trades;
    const truncTrades = runBacktest(isolate(truncated), RULES).trades;

    assert.ok(truncTrades.length <= fullTrades.length);
    for (let i = 0; i < truncTrades.length; i++) {
      assert.deepEqual(truncTrades[i], fullTrades[i]); // later bars didn't alter earlier decisions
    }
  });
});
