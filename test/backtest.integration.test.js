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

// Pin the filter OFF for tests of filter-independent behavior, so they don't
// depend on the config.strategy default (which ships with the filter ON).
const NO_FILTER = { regimeFilter: { enabled: false, smaPeriod: 200 } };

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
    const { trades } = runBacktest(isolate(bars), RULES, NO_FILTER);

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

    const fullTrades = runBacktest(isolate(full), RULES, NO_FILTER).trades;
    const truncTrades = runBacktest(isolate(truncated), RULES, NO_FILTER).trades;

    assert.ok(truncTrades.length <= fullTrades.length);
    for (let i = 0; i < truncTrades.length; i++) {
      assert.deepEqual(truncTrades[i], fullTrades[i]); // later bars didn't alter earlier decisions
    }
  });
});

// --- ATR-mode series: same 20-day warm-up/breakout shape, but with enough
// daily range (high/low) that ATR is well-defined, and a post-entry pullback
// that trips the ATR stop while staying well above the 10-day channel low —
// proving the ATR path drives a *different, tighter* exit than channel mode
// would, not just a relabeled one.
//
//   bars 0..19  h=101 l=99 c=100  warm-up. TR=2 every day once prevClose
//               exists, so ATR(5) converges to a flat 2 by day 4 and holds.
//   bar  20     h=111 l=109 c=110  BREAKOUT ENTRY (close > prior-20 high).
//               TR20 = max(2, |111-100|, |109-100|) = 11
//               ATR20 = (2*4 + 11)/5 = 3.8
//               stopLevel (atr) = 110 - atr_multiple(2) * 3.8 = 102.4
//   bar  21     h=103 l=101 c=102  close 102 <= 102.4  => ATR HARD-STOP.
//               The 10-day channel low at day21 is still 100 (days 11..19
//               all closed at 100), so close=102 would NOT trip a channel
//               exit — this exit only happens because of the ATR stop.
const atrBar = (date, high, low, close) => ({ date, open: close, high, low, close, volume: 1_000_000 });

function buildAtrSeries() {
  const bars = [];
  for (let i = 0; i < 20; i++) bars.push(atrBar(dayISO(i), 101, 99, 100));
  bars.push(atrBar(dayISO(20), 111, 109, 110));
  bars.push(atrBar(dayISO(21), 103, 101, 102));
  for (let i = 22; i <= 30; i++) bars.push(atrBar(dayISO(i), 103, 101, 102));
  return bars;
}

const RULES_ATR = {
  max_risk_per_trade: 0.01,
  max_position_pct: 0.2,
  max_correlated_positions: 2,
  stop_method: 'atr',
  atr_period: 5,
  atr_multiple: 2,
};

describe('runBacktest (integration, atr mode)', () => {
  it('exits on the ATR-derived hard stop, tighter than the channel would', () => {
    const bars = buildAtrSeries();
    const { trades } = runBacktest(isolate(bars), RULES_ATR, NO_FILTER);

    const slip = config.costBps / 10000;
    const riskPerShare = 7.6; // 110 - 102.4
    const expEntry = 110 * (1 + slip);
    const expExit = 102 * (1 - slip);
    const expR = (expExit - expEntry) / riskPerShare;
    const expShares = Math.floor((50000 * 0.01) / riskPerShare); // 65

    assert.equal(trades.length, 1);
    const t = trades[0];
    assert.equal(t.entryDate, dayISO(20));
    assert.equal(t.exitDate, dayISO(21));
    assert.equal(t.reason, 'hard-stop');
    assert.equal(t.shares, expShares);
    assert.ok(Math.abs(t.rMultiple - expR) < 1e-9, `R ${t.rMultiple} vs ${expR}`);
  });

  it('the same bars in channel mode do not exit on day 21 (proves the stop source actually changed)', () => {
    const bars = buildAtrSeries();
    const { trades, openAtEnd } = runBacktest(isolate(bars), RULES, NO_FILTER);

    assert.equal(trades.length, 0, 'channel low (100) never breached by a close of 102');
    assert.deepEqual(openAtEnd, [CARRIER]);
  });
});

// --- Regime-filter series. The filter only bites when smaPeriod > entryLookback:
// a 20-day-high breakout is by definition above any *shorter* average, so the
// SMA must reach further back (into old higher prices) to veto. This series is
// a downtrend that bounces into a fresh 20-day high that is still below the
// longer (30-day) SMA.
//
//   bars  0..9   close=200   old high prices (drag the 30-day SMA up)
//   bars 10..29  close=100   recent lower prices (the 20-day breakout window)
//   bar  30      close=105   breakout: 105 > prior-20 high (=100)
//                            SMA(30) = (10*200 + 20*100)/30 = 133.3, so 105 <= 133.3
//                            => filter ON skips; filter OFF takes it
//   bar  31      close=95    hits the channel/hard stop (<=100) => exit (filter OFF)
function buildRegimeSeries() {
  const bars = [];
  for (let i = 0; i < 10; i++) bars.push(bar(dayISO(i), 200));
  for (let i = 10; i <= 29; i++) bars.push(bar(dayISO(i), 100));
  bars.push(bar(dayISO(30), 105));
  bars.push(bar(dayISO(31), 95));
  return bars;
}

const REGIME_ON = { regimeFilter: { enabled: true, smaPeriod: 30 } };
const REGIME_OFF = { regimeFilter: { enabled: false, smaPeriod: 30 } };

describe('runBacktest (integration, regime filter)', () => {
  it('filter OFF takes the below-SMA breakout', () => {
    const bars = buildRegimeSeries();
    const { trades } = runBacktest(isolate(bars), RULES, REGIME_OFF);
    assert.equal(trades.length, 1);
    assert.equal(trades[0].entryDate, dayISO(30));
  });

  it('filter ON skips the same breakout (close below the 30-day SMA)', () => {
    const bars = buildRegimeSeries();
    const { trades, openAtEnd } = runBacktest(isolate(bars), RULES, REGIME_ON);
    assert.equal(trades.length, 0);
    assert.equal(openAtEnd.length, 0, 'no position was ever opened');
  });

  it('explicitly disabling the filter reproduces the pre-filter behavior', () => {
    // The durable backward-compat guarantee: with the filter disabled, the
    // original one-trade channel series still produces exactly its one trade,
    // independent of what config.strategy defaults to.
    const bars = buildSeries();
    const { trades } = runBacktest(isolate(bars), RULES, NO_FILTER);
    assert.equal(trades.length, 1);
    assert.equal(trades[0].entryDate, dayISO(20));
  });

  it('config.strategy now ships with the filter enabled (adopted)', () => {
    assert.equal(config.strategy.regimeFilter.enabled, true);
    assert.equal(config.strategy.regimeFilter.smaPeriod, 200);
  });
});
