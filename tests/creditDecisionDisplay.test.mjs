import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bankCoverageSuffix,
  resolveCreditPhase,
  lacksCreditRuleBuckets,
} from '../lib/utils/creditDecisionDisplay.ts';

describe('bankCoverageSuffix', () => {
  it('uses bureau only for terminal bureau-only REJECTED', () => {
    const run = {
      finalVerdict: 'REJECTED',
      feature_coverage: { bank_mapped: 0, bank_total: 300, bureau_mapped: 137, bureau_total: 204 },
    };
    assert.equal(resolveCreditPhase(run).key, 'bureau');
    assert.equal(bankCoverageSuffix(run), ' (bureau only)');
  });

  it('uses AA pending while awaiting consent', () => {
    const run = {
      finalVerdict: 'AWAITING_AA_CONSENT',
      awaitingAaConsent: true,
      feature_coverage: { bank_mapped: 0, bank_total: 300 },
    };
    assert.equal(resolveCreditPhase(run).key, 'paused');
    assert.equal(bankCoverageSuffix(run), ' (AA pending)');
  });

  it('has no suffix when bank features are mapped', () => {
    const run = {
      finalVerdict: 'PRE_APPROVED',
      feature_coverage: { bank_mapped: 120, bank_total: 300 },
    };
    assert.equal(bankCoverageSuffix(run), '');
  });

  it('uses remap pending when AA granted but bank still zero', () => {
    const run = {
      finalVerdict: 'MANUAL_REVIEW',
      aaConsentStatus: 'granted',
      engine_phase: 'full',
      feature_coverage: { bank_mapped: 0, bank_total: 300 },
    };
    // MANUAL_REVIEW alone is bureau-only; AA granted + full phase still means remap pending
    // when bank_mapped is 0 — prefer remap over bureau-only when AA clearly completed.
    assert.equal(bankCoverageSuffix(run), ' (remap pending)');
  });
});

describe('lacksCreditRuleBuckets', () => {
  it('treats summary marker as needing detail', () => {
    assert.equal(lacksCreditRuleBuckets({ _creditView: 'summary', finalVerdict: 'REJECTED' }), true);
  });

  it('treats detail marker as complete', () => {
    assert.equal(lacksCreditRuleBuckets({ _creditView: 'detail', fired_rules: [] }), false);
  });
});
