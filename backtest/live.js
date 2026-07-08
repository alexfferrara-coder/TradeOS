// Live PAPER dry-run loop (v1). Reads the paper account, runs the shared
// decision logic on the last COMPLETED daily bar, and reports the orders it
// WOULD place — submitting nothing. There is no order-submission code here by
// design. Run manually:
//
//   node backtest/live.js

import { config } from './config.js';
import { loadRiskRules } from '../src/risk/loadRiskRules.js';
import { atrSeries } from './atr.js';
import { decideEntry, decideExit } from './decide.js';
import { createAlpacaBroker } from './broker.js';
import { loadState, reconcile } from './state.js';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const STATE_PATH = fileURLToPath(new URL('./live-state.json', import.meta.url));

// The last COMPLETED session's index: if the freshest bar is dated today (ET),
// it may still be forming, so step back to the prior bar. Returns -1 if there
// isn't enough history to decide.
export function pickDecisionIndex(bars, todayET) {
  if (bars.length === 0) return -1;
  const last = bars.length - 1;
  const i = bars[last].date === todayET ? last - 1 : last;
  return i;
}

// Pure orchestration: no printing, no persistence, no network beyond the
// injected broker. Returns a structured report. `positionState` is the loaded
// local strategy-state map (passed in so this stays file-IO-free / testable).
export async function runLive({
  broker,
  rules,
  strategy = config.strategy,
  symbols = config.symbols,
  positionState = {},
  now = new Date(),
}) {
  const useAtr = rules.stop_method === 'atr';
  const todayET = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const account = await broker.getAccount();
  const rawPositions = await broker.getPositions();
  const { positions: held, flagged } = reconcile(positionState, rawPositions);
  const heldBySymbol = new Map(held.map((p) => [p.symbol, p]));
  const openCount = held.length;

  const decisions = [];
  for (const symbol of symbols) {
    const bars = await broker.getRecentBars(symbol);
    const i = pickDecisionIndex(bars, todayET);
    if (i < 0) {
      decisions.push({ symbol, status: 'NO-DATA', detail: 'no completed bar available' });
      continue;
    }
    const date = bars[i].date;
    const pos = heldBySymbol.get(symbol);

    if (pos) {
      if (!pos.hasLocalState) {
        decisions.push({ symbol, date, status: 'FLAGGED', detail: 'held but no local stop state' });
        continue;
      }
      const { exit, reason } = decideExit({ bars, i, position: pos });
      decisions.push(
        exit
          ? { symbol, date, status: 'EXIT', detail: `exit (${reason})`, qty: pos.qty }
          : { symbol, date, status: 'HOLD', detail: 'no exit signal' }
      );
      continue;
    }

    const atrAtEntry = useAtr ? atrSeries(bars, rules.atr_period)[i] : undefined;
    const d = decideEntry({ bars, i, equity: account.equity, openCount, rules, strategy, atrAtEntry });
    if (d.accepted) {
      decisions.push({
        symbol,
        date,
        status: 'ENTER',
        detail: `${d.shares} sh @ ~${bars[i].close} · stop ${d.stopLevel.toFixed(2)}`,
        shares: d.shares,
        stopLevel: d.stopLevel,
        riskPerShare: d.riskPerShare,
        entry: bars[i].close,
      });
    } else {
      decisions.push({ symbol, date, status: 'SKIP', detail: d.reason });
    }
  }

  return {
    asOf: todayET,
    account,
    heldCount: openCount,
    flagged,
    decisions,
    submitted: false, // v1 is dry-run — always false
  };
}

async function main() {
  let rules;
  try {
    rules = loadRiskRules();
  } catch (e) {
    console.error(`\n✖ Risk rules failed to load — refusing to run live loop (fail-closed).\n  ${e.message}\n`);
    process.exit(1);
  }

  const broker = createAlpacaBroker();
  const positionState = loadState(STATE_PATH);
  const report = await runLive({ broker, rules, positionState });

  console.log(`\nLive dry-run  ${report.asOf}  (PAPER · no orders submitted)`);
  console.log(
    `Account: equity $${report.account.equity.toFixed(2)} · ${report.heldCount} open position(s)`
  );
  if (report.flagged.length) {
    console.log(`⚠ Positions with no local stop state (exit not evaluated): ${report.flagged.join(', ')}`);
  }
  console.log('\n── Today’s decisions ─────────────────────────────');
  for (const d of report.decisions) {
    console.log(`  ${d.symbol.padEnd(5)} ${d.status.padEnd(8)} ${d.detail}`);
  }

  const timestamp = new Date().toISOString();
  const resultsDir = new URL('./results/', import.meta.url);
  mkdirSync(resultsDir, { recursive: true });
  const outFile = new URL(`live-${timestamp.replace(/[:.]/g, '-')}.json`, resultsDir);
  writeFileSync(outFile, JSON.stringify({ timestamp, rules, report }, null, 2));
  console.log(`\nReport written: ${fileURLToPath(outFile)}`);
}

// Only run the loop when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
