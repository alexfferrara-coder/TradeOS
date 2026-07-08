// Entrypoint. Loads the risk rules FIRST and fails closed: if the gate can't
// load or validate, the backtest refuses to run — it never proceeds unrestricted.
//
//   node backtest/run.js

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
      `\n✖ Risk rules failed to load — refusing to run backtest (fail-closed).\n  ${e.message}\n`
    );
    process.exit(1);
  }
  console.log(
    `Risk gate loaded: ${pct(rules.max_risk_per_trade)} risk/trade, ` +
      `${pct(rules.max_position_pct)} max position, ` +
      `${rules.max_correlated_positions} concurrent cap.`
  );

  // --- Data (read-only historical bars). ---
  const barsBySymbol = {};
  for (const sym of config.symbols) {
    barsBySymbol[sym] = await getDailyBars(sym, config);
    console.log(`  ${sym}: ${barsBySymbol[sym].length} daily bars`);
  }

  // --- Simulate. ---
  const { trades, rejected, finalEquity, openAtEnd } = runBacktest(
    barsBySymbol,
    rules
  );

  // --- Per-trade log. ---
  console.log('\n── Trades ───────────────────────');
  for (const t of trades) {
    console.log(
      `${t.symbol.padEnd(5)} ${t.entryDate} → ${t.exitDate} ` +
        `${t.reason.padEnd(10)} R=${t.rMultiple.toFixed(2).padStart(6)} ` +
        `ret=${pct(t.retPct).padStart(8)} pnl=${usd(t.pnl).padStart(12)}`
    );
  }

  // --- Summary. ---
  const s = summarize(trades, config.startEquity);
  console.log('\n── Summary ──────────────────────');
  console.log(`Trades:        ${s.n}   (rejected by gate: ${rejected})`);
  console.log(`Win rate:      ${pct(s.winRate)}`);
  console.log(`Avg win:       ${pct(s.avgWin)}  (${s.avgWinR.toFixed(2)}R)`);
  console.log(`Avg loss:      ${pct(s.avgLoss)}  (${s.avgLossR.toFixed(2)}R)`);
  console.log(
    `Expectancy:    ${s.expectancyR.toFixed(3)}R  (${pct(s.expectancyPct)} per trade)`
  );
  console.log(
    `Total P&L:     ${usd(s.totalPnl)}   Final equity: ${usd(finalEquity)}`
  );
  console.log(
    `Max drawdown:  ${pct(s.maxDrawdownPct)}  (${usd(s.maxDrawdownUsd)})`
  );
  if (openAtEnd.length) {
    console.log(
      `Still open at end (excluded from stats): ${openAtEnd.join(', ')}`
    );
  }

  // --- Persist results (additive; the console output above is unchanged). ---
  const timestamp = new Date().toISOString();
  const resultsDir = new URL('./results/', import.meta.url);
  mkdirSync(resultsDir, { recursive: true });
  // ':' and '.' are stripped from the FILENAME for filesystem safety; the
  // `timestamp` FIELD inside the JSON stays true ISO-8601.
  const outFile = new URL(`${timestamp.replace(/[:.]/g, '-')}.json`, resultsDir);
  writeFileSync(
    outFile,
    JSON.stringify(
      { timestamp, config, rules, trades, summary: s, rejected, finalEquity, openAtEnd },
      null,
      2
    )
  );
  console.log(`Results written: ${fileURLToPath(outFile)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
