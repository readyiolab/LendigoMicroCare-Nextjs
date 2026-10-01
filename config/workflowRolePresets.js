/**
 * Staff workflow role cards — mirrors backend/config/workflowRolePresets.js metadata.
 * Runtime authority remains role_code gates on the server.
 */

import { DSA_PARTNER_UI_ENABLED, DSA_PARTNER_ROLE_CODES } from '@/config/featureFlags';

export const WORKFLOW_ROLE_CARDS = {
  credit_manager: {
    stage: 'credit',
    primary_flow: true,
    selectable: true,
    summary: 'Verify KYC, documents, and BRE — then recommend or reject. Cannot approve or disburse.',
    receives: 'Drafts plus own cases through disbursal (view-only after Recommended)',
    can_do: [
      'Verify PAN, eKYC, bank, selfie, and documents',
      'Run / review BRE and credit checks',
      'Recommend or reject applications (including drafts)',
    ],
    cannot_do: ['Approve limits', 'Send offers', 'Verify video / e-sign / mandate', 'Disburse', 'Download MIS', 'Fill customer application'],
    next_handoff: 'Underwriter',
  },
  underwriter: {
    stage: 'underwriting',
    primary_flow: true,
    selectable: true,
    summary: 'Receives recommended cases — approve, reject, or send offer with product terms.',
    receives: 'Recommended applications (can also reject drafts)',
    can_do: [
      'Review Credit Manager recommendation and CAM',
      'Approve or reject (including drafts)',
      'Choose loan product / amount / tenure / rate and send offer',
    ],
    cannot_do: ['Recommend from scratch', 'Verify video / e-sign / mandate', 'Disburse'],
    next_handoff: 'Customer (accept offer) → Operations Manager',
  },
  operations_manager: {
    stage: 'operations',
    primary_flow: true,
    selectable: true,
    summary: 'After customer accepts — verify video, track e-sign & mandate, then disburse.',
    receives: 'Offer-accepted through payment-pending cases',
    can_do: [
      'Verify or reject video declarations',
      'Track e-sign and mandate / eNACH',
      'Queue disbursal sheet and export / complete payout',
      'Oversee repayments where allowed',
    ],
    cannot_do: ['Recommend credit', 'Approve / send offer'],
    next_handoff: null,
  },
  operations: {
    stage: 'operations',
    primary_flow: false,
    selectable: false,
    summary: 'Legacy role — use Operations Manager for new staff.',
    receives: 'Offer-accepted through payment-pending cases',
    can_do: [],
    cannot_do: [],
    next_handoff: null,
  },
  telecaller: {
    stage: 'intake',
    primary_flow: false,
    selectable: true,
    summary: 'Application intake and quality check before credit review.',
    receives: 'Draft and newly submitted applications',
    can_do: [
      'Open fresh leads',
      'Complete intake details',
      'Move cases into eligibility check',
      'View disbursed loans and download documents',
    ],
    cannot_do: ['Recommend or approve', 'Send offers', 'Verify video or disburse', 'Open Digitap KYC from the case page'],
    next_handoff: 'Credit Manager',
  },
  collection_manager: {
    stage: 'collection',
    primary_flow: false,
    selectable: true,
    summary: 'Post-disbursement collections and repayment follow-up.',
    receives: 'Disbursed loans',
    can_do: [
      'View disbursed accounts',
      'Track repayments and collections',
      'View KYC, video declaration, and sanction letter on the case',
    ],
    cannot_do: ['Recommend, approve, or send offers', 'Disburse new loans'],
    next_handoff: null,
  },
  super_admin: {
    stage: 'system',
    primary_flow: false,
    selectable: true,
    summary: 'Full system access — all stages and staff management.',
    receives: 'All applications and admin settings',
    can_do: ['Manage users and roles', 'Override incomplete checklist', 'Act at any loan stage'],
    cannot_do: [],
    next_handoff: null,
  },
};

export function getWorkflowCard(roleCode, apiWorkflow = null) {
  if (apiWorkflow?.is_builtin) {
    return {
      stage: apiWorkflow.stage,
      primary_flow: !!apiWorkflow.primary_flow,
      selectable: apiWorkflow.selectable !== false,
      summary: apiWorkflow.summary,
      receives: apiWorkflow.receives,
      can_do: apiWorkflow.can_do || [],
      cannot_do: apiWorkflow.cannot_do || [],
      next_handoff: apiWorkflow.next_handoff,
    };
  }
  return WORKFLOW_ROLE_CARDS[roleCode] || {
    stage: 'custom',
    primary_flow: false,
    selectable: true,
    summary: 'Custom role — configure module access and loan stages in Role Management.',
    receives: null,
    can_do: [],
    cannot_do: [],
    next_handoff: null,
  };
}

/** Roles shown when creating/editing staff (hides legacy operations). */
export function sortRolesForStaffPicker(roles = []) {
  const order = {
    credit_manager: 1,
    underwriter: 2,
    operations_manager: 3,
    telecaller: 4,
    collection_manager: 5,
    super_admin: 99,
  };
  return [...roles]
    .filter((r) => {
      if (r.role_code === 'operations') return false;
      if (!DSA_PARTNER_UI_ENABLED && DSA_PARTNER_ROLE_CODES.includes(r.role_code)) return false;
      const card = getWorkflowCard(r.role_code, r.workflow);
      return card.selectable !== false;
    })
    .sort((a, b) => {
      const ao = order[a.role_code] ?? 50;
      const bo = order[b.role_code] ?? 50;
      if (ao !== bo) return ao - bo;
      return String(a.role_name || '').localeCompare(String(b.role_name || ''));
    });
}
