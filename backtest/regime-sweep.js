// Regime-filter sweep. Runs a filter-OFF baseline plus one run per SMA horizon
// in config.sweep.regimeSmaPeriods (filter ON), holding atr_multiple constant
// so the only thing varying across rows is the filter and its horizon. Same
// fail-closed risk gate as run.js/sweep.js: loads rules first, refuses to run
// if they don't load/validate.
//
//   node backtest/regime-sweep.js

import { loadRiskRules } from '../src/risk/loadRiskRules.js';
import { config } from './config.js';
import { getDailyBars } from './alpaca.js';
import { runBacktest } from './backtest.js';
import { summarize } from './stats.js';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const pct = (x) => `${(x * 100).toFixed(2)}%`;
const usd = (x) => `$${x.toFixed(2)}`;

async function main() {
  // --- Risk gate: load before anything else, fail closed on any error. ---
  let rules;
  try {
    rules = loadRiskRules();
  } catch (e) {
    console.error(
      `\n✖ Risk rules failed to load — refusing to run regime sweep (fail-closed).\n  ${e.message}\n`
    );
    process.exit(1);
  }

  const periods = config.sweep.regimeSmaPeriods;
  console.log(
    `Risk gate loaded: stop_method=${rules.stop_method}. Regime sweep over SMA ` +
      `[${periods.join(', ')}] vs a filter-off baseline (atr_multiple held fixed).`
  );

  // --- Data (read-only historical bars, shared across every run). ---
  const barsBySymbol = {};
  for (const sym of config.symbols) {
    barsBySymbol[sym] = await getDailyBars(sym, config);
    console.log(`  ${sym}: ${barsBySymbol[sym].length} daily bars`);
  }

  // --- Baseline (filter off) + one run per SMA horizon (filter on). ---
  const runOne = (label, regimeFilter) => {
    const strategy = { ...config.strategy, regimeFilter };
    const { trades, rejected, finalEquity, openAtEnd } = runBacktest(
      barsBySymbol,
      rules,
      strategy
    );
    const summary = summarize(trades, config.startEquity);
    return { label, regimeFilter, trades, rejected, finalEquity, openAtEnd, summary };
  };

  const results = [
    runOne('filter OFF', { enabled: false, smaPeriod: 0 }),
    ...periods.map((smaPeriod) =>
      runOne(`SMA ${smaPeriod}`, { enabled: true, smaPeriod })
    ),
  ];

  // --- Comparison table. ---
  console.log('\n── regime-filter sweep ───────────────────────────────────────────────');
  console.log(
    'config       trades  win%    expR     exp%     total P&L      maxDD%   maxDD$'
  );
  for (const r of results) {
    const s = r.summary;
    console.log(
      `${r.label.padEnd(11)}  ` +
        `${String(s.n).padStart(6)}  ` +
        `${pct(s.winRate).padStart(6)}  ` +
        `${s.expectancyR.toFixed(3).padStart(7)}  ` +
        `${pct(s.expectancyPct).padStart(7)}  ` +
        `${usd(s.totalPnl).padStart(14)}  ` +
        `${pct(s.maxDrawdownPct).padStart(7)}  ` +
        `${usd(s.maxDrawdownUsd).padStart(10)}`
    );
  }

  // --- Persist results. ---
  const timestamp = new Date().toISOString();
  const resultsDir = new URL('./results/', import.meta.url);
  mkdirSync(resultsDir, { recursive: true });
  const outFile = new URL(
    `regime-sweep-${timestamp.replace(/[:.]/g, '-')}.json`,
    resultsDir
  );
  writeFileSync(
    outFile,
    JSON.stringify({ timestamp, config, rules, results }, null, 2)
  );
  console.log(`\nResults written: ${fileURLToPath(outFile)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
