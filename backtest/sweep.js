// Sweep entrypoint. Runs the backtest once per atr_multiple in
// config.sweep.atrMultiples, holding atr_period and the Donchian lookbacks
// fixed, and reports a comparison table. Same fail-closed risk gate as
// run.js: loads rules first, refuses to run if they don't load/validate —
// and additionally refuses to run if stop_method isn't 'atr', since
// sweeping atr_multiple only makes sense when it's the active stop source.
//
//   node backtest/sweep.js

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
      `\n✖ Risk rules failed to load — refusing to run sweep (fail-closed).\n  ${e.message}\n`
    );
    process.exit(1);
  }

  if (rules.stop_method !== 'atr') {
    console.error(
      `\n✖ Sweep requires stop_method: atr in the risk rules — found ` +
        `'${rules.stop_method}'. Sweeping atr_multiple is meaningless when ` +
        `it isn't the active stop source.\n`
    );
    process.exit(1);
  }

  const multiples = config.sweep.atrMultiples;
  console.log(
    `Risk gate loaded: stop_method=atr, atr_period=${rules.atr_period}, ` +
      `sweeping atr_multiple over [${multiples.join(', ')}].`
  );

  // --- Data (read-only historical bars, shared across every sweep run). ---
  const barsBySymbol = {};
  for (const sym of config.symbols) {
    barsBySymbol[sym] = await getDailyBars(sym, config);
    console.log(`  ${sym}: ${barsBySymbol[sym].length} daily bars`);
  }

  // --- Sweep: one backtest per atr_multiple, atr_period/lookbacks fixed. ---
  const results = multiples.map((atr_multiple) => {
    const swept = { ...rules, atr_multiple };
    const { trades, rejected, finalEquity, openAtEnd } = runBacktest(
      barsBySymbol,
      swept
    );
    const summary = summarize(trades, config.startEquity);
    return { atr_multiple, trades, rejected, finalEquity, openAtEnd, summary };
  });

  // --- Comparison table. ---
  console.log('\n── atr_multiple sweep ────────────────────────────────────────────────');
  console.log(
    'multiple  trades  win%    expR     exp%     total P&L      maxDD%   maxDD$'
  );
  for (const r of results) {
    const s = r.summary;
    console.log(
      `${r.atr_multiple.toFixed(2).padStart(8)}  ` +
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
    `sweep-${timestamp.replace(/[:.]/g, '-')}.json`,
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
