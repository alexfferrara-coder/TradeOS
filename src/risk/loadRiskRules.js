import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

const RULES_PATH = resolve(
  process.env.HOME,
  'Documents/Risk As./Risk Framework/My Risk Rules.md'
);

const REQUIRED = ['max_risk_per_trade', 'max_position_pct', 'max_correlated_positions'];

export function loadRiskRules(filePath = RULES_PATH) {
  const text = readFileSync(filePath, 'utf8');

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('No YAML frontmatter found in risk rules file');

  const raw = yaml.load(match[1]);

  if (!raw.enabled) throw new Error('Risk ruleset is disabled or missing enabled flag — refusing to return limits');

  for (const key of REQUIRED) {
    if (!(key in raw) || raw[key] === null || raw[key] === undefined) {
      throw new Error(`Missing required field: ${key}`);
    }
  }

  const { max_risk_per_trade, max_position_pct, max_correlated_positions } = raw;

  if (typeof max_risk_per_trade !== 'number')
    throw new Error('max_risk_per_trade must be a number');
  if (max_risk_per_trade <= 0)
    throw new Error('max_risk_per_trade must be > 0');
  if (max_risk_per_trade > 0.1)
    throw new Error(`max_risk_per_trade ${max_risk_per_trade} exceeds max allowed (0.1)`);

  if (typeof max_position_pct !== 'number')
    throw new Error('max_position_pct must be a number');
  if (max_position_pct <= 0)
    throw new Error('max_position_pct must be > 0');
  if (max_position_pct > 1.0)
    throw new Error(`max_position_pct ${max_position_pct} exceeds max allowed (1.0)`);

  if (!Number.isInteger(max_correlated_positions))
    throw new Error('max_correlated_positions must be an integer');
  if (max_correlated_positions <= 0)
    throw new Error('max_correlated_positions must be a positive integer');

  return { max_risk_per_trade, max_position_pct, max_correlated_positions };
}
