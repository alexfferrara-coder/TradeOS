import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { loadRiskRules } from '../src/risk/loadRiskRules.js';

// All tests load fixtures from test/fixtures/risk-rules — the real
// "My Risk Rules.md" note is never read or written here.
const FIXTURES = resolve(import.meta.dirname, 'fixtures', 'risk-rules');
const fixture = (name) => resolve(FIXTURES, name);

describe('loadRiskRules', () => {
  it('happy path returns the three values', () => {
    const rules = loadRiskRules(fixture('valid.md'));
    assert.deepEqual(rules, {
      max_risk_per_trade: 0.01,
      max_position_pct: 0.2,
      max_correlated_positions: 3,
    });
  });

  it('throws when no YAML frontmatter present', () => {
    assert.throws(() => loadRiskRules(fixture('no-frontmatter.md')), /frontmatter/);
  });

  it('throws when enabled flag is missing', () => {
    assert.throws(
      () => loadRiskRules(fixture('missing-enabled.md')),
      /disabled or missing enabled/
    );
  });

  it('throws when enabled !== true', () => {
    assert.throws(() => loadRiskRules(fixture('disabled.md')), /disabled/);
  });

  it('throws on missing required field', () => {
    // Drops max_correlated_positions; the same loop guards all three
    // REQUIRED keys (max_risk_per_trade, max_position_pct, ...).
    assert.throws(
      () => loadRiskRules(fixture('missing-field.md')),
      /Missing required field/
    );
  });

  it('throws when max_position_pct > 1.0', () => {
    assert.throws(
      () => loadRiskRules(fixture('position-pct-too-high.md')),
      /exceeds max allowed \(1\.0\)/
    );
  });

  it('throws when max_risk_per_trade > 0.1', () => {
    assert.throws(
      () => loadRiskRules(fixture('risk-too-high.md')),
      /exceeds max allowed \(0\.1\)/
    );
  });

  it('throws on non-positive max_risk_per_trade', () => {
    assert.throws(
      () => loadRiskRules(fixture('risk-non-positive.md')),
      /max_risk_per_trade must be > 0/
    );
  });

  it('throws when max_correlated_positions is not an integer', () => {
    assert.throws(
      () => loadRiskRules(fixture('correlated-not-integer.md')),
      /must be an integer/
    );
  });

  it('throws on wrong type (non-number) field', () => {
    assert.throws(
      () => loadRiskRules(fixture('wrong-type.md')),
      /max_position_pct must be a number/
    );
  });
});
