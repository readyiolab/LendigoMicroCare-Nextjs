import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCreditDecisionGates } from '../lib/utils/creditDecisionGates.ts';
import {
  computeApplicationNextStep,
  isCreditHardRejected,
  isCreditCheckComplete,
  shouldDeferWorkflowCreditCta,
} from '../lib/utils/applicationNextStep.ts';

const kycDone = {
  aadhaarVerified: true,
  panVerified: true,
  bankVerified: true,
  selfieVerified: true,
  latestCreditRun: { finalVerdict: 'PRE_APPROVED' },
};

describe('shouldDeferWorkflowCreditCta', () => {
  it('defers when credit is loading and run is still null', () => {
    assert.equal(shouldDeferWorkflowCreditCta(true, null), true);
  });

  it('does not defer after credit settled with no run (show Run credit check)', () => {
    assert.equal(shouldDeferWorkflowCreditCta(false, null), false);
  });

  it('does not defer when a credit run is already present', () => {
    assert.equal(shouldDeferWorkflowCreditCta(true, { finalVerdict: 'PRE_APPROVED' }), false);
    assert.equal(shouldDeferWorkflowCreditCta(false, { finalVerdict: 'PRE_APPROVED' }), false);
  });
});

describe('evaluateCreditDecisionGates (CIBIL-first)', () => {
  it('is ready without KYC steps', () => {
    const gates = evaluateCreditDecisionGates({
      aadhaarVerified: false,
      panVerified: false,
      bankVerified: false,
      selfieVerified: false,
    });
    assert.equal(gates.ready, true);
    assert.deepEqual(gates.missing, []);
    assert.equal(gates.message, null);
  });
});

describe('computeApplicationNextStep (CIBIL-first)', () => {
  it('asks for credit check before Aadhaar', () => {
    const next = computeApplicationNextStep({
      aadhaarVerified: false,
      panVerified: false,
      bankVerified: false,
      selfieVerified: false,
      latestCreditRun: null,
      applicationStatus: 'submitted',
    });
    assert.equal(next.steps[0].id, 'credit');
    assert.equal(next.nextAction.runCreditCheck, true);
    assert.match(next.nextMessage, /credit check/i);
  });

  it('moves to Aadhaar after a non-reject credit verdict', () => {
    const next = computeApplicationNextStep({
      aadhaarVerified: false,
      panVerified: false,
      bankVerified: false,
      selfieVerified: false,
      latestCreditRun: { finalVerdict: 'PRE_APPROVED' },
      applicationStatus: 'submitted',
    });
    assert.equal(next.nextAction.tab, 'kyc');
    assert.match(next.nextMessage, /Aadhaar/i);
  });

  it('continues KYC after credit REJECTED while app is still open', () => {
    assert.equal(isCreditHardRejected({ finalVerdict: 'REJECTED' }), true);
    assert.equal(isCreditCheckComplete({ finalVerdict: 'REJECTED' }), true);
    const next = computeApplicationNextStep({
      aadhaarVerified: false,
      panVerified: false,
      bankVerified: false,
      selfieVerified: false,
      latestCreditRun: { finalVerdict: 'REJECTED' },
      applicationStatus: 'submitted',
    });
    assert.equal(next.nextAction.tab, 'kyc');
    assert.match(next.nextMessage, /Aadhaar/i);
  });

  it('stops only when application_status is rejected', () => {
    const next = computeApplicationNextStep({
      aadhaarVerified: false,
      panVerified: false,
      bankVerified: false,
      selfieVerified: false,
      latestCreditRun: { finalVerdict: 'REJECTED' },
      applicationStatus: 'rejected',
    });
    assert.equal(next.nextAction.runCreditCheck, false);
    assert.match(next.nextMessage, /rejected/i);
  });

  it('after recommend points UW to CAM Approve & issue LAN (not All done)', () => {
    const next = computeApplicationNextStep({
      ...kycDone,
      applicationStatus: 'recommended',
    });
    assert.equal(next.steps.find((s) => s.id === 'decision')?.done, true);
    assert.equal(next.nextAction.tab, 'cam');
    assert.equal(next.ctaLabel, 'Open CAM');
    assert.match(next.nextMessage, /Approve & issue LAN/i);
    assert.notEqual(next.ctaLabel, 'All done');
  });

  it('after sanction points staff to Send offer on Actions', () => {
    const next = computeApplicationNextStep({
      ...kycDone,
      applicationStatus: 'approved',
    });
    assert.equal(next.nextAction.tab, 'actions');
    assert.equal(next.ctaLabel, 'Send offer');
    assert.match(next.nextMessage, /Sanctioned/i);
    assert.notEqual(next.ctaLabel, 'All done');
  });

  it('after offer sent shows waiting for customer', () => {
    const next = computeApplicationNextStep({
      ...kycDone,
      applicationStatus: 'offer_sent',
    });
    assert.equal(next.ctaLabel, 'All done');
    assert.match(next.nextMessage, /waiting for customer/i);
  });
});
