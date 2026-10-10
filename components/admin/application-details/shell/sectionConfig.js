import {
  Layout,
  User,
  FileText,
  ShieldCheck,
  Award,
  Activity,
  History,
  Phone,
  Map,
  CreditCard,
  PieChart,
  CheckCircle2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { hasPermission } from '@/lib/permissionUtils';

/** Case sections — plain-English labels for non-technical staff */
export const SECTION_META = {
  overview: { label: 'Overview', icon: Layout, group: 'case' },
  loan_history: { label: 'Loan History', icon: History, group: 'case' },
  // Merged into Overview; kept for old deep-links and the permissions UI
  user: { label: 'Customer Details', icon: User, group: 'case' },
  journey: { label: 'Customer Journey', icon: Map, group: 'case' },
  documents: { label: 'Documents', icon: FileText, group: 'evidence' },
  cam: { label: 'CAM', icon: FileText, group: 'decision' },
  kyc: { label: 'KYC Check', icon: ShieldCheck, group: 'evidence' },
  // Legacy alias — same meta as kyc for old deep-links / permissions UI
  digio_kyc: { label: 'KYC Check', icon: ShieldCheck, group: 'evidence' },
  verification: { label: 'Video Declaration', icon: UserCheck, group: 'evidence' },
  bre: { label: 'Credit Rules', icon: Activity, group: 'risk' },
  payday: { label: 'Payday decision', icon: Wallet, group: 'risk' },
  aa: { label: 'Bank Statement', icon: FileText, group: 'evidence' },
  crif: { label: 'CIBIL Bureau', icon: Activity, group: 'risk' },
  call_logs: { label: 'Call Logs', icon: Phone, group: 'ops' },
  history: { label: 'Activity Log', icon: History, group: 'ops' },
  repayments: { label: 'Repayments & Collections', icon: CreditCard, group: 'ops' },
  breakdown: { label: 'Charges & Fees', icon: PieChart, group: 'ops' },
  disbursement: { label: 'Disbursal', icon: Award, group: 'ops' },
  loan_account: { label: 'Loan Account', icon: FileText, group: 'ops' },
  actions: { label: 'Final Decision', icon: CheckCircle2, group: 'decision' },
};

/** Normalize legacy tab ids: digio_kyc -> kyc, user (Customer Details) -> overview */
export function normalizeSectionId(id) {
  if (id === 'digio_kyc') return 'kyc';
  if (id === 'user') return 'overview';
  return id;
}

export const SECTION_GROUPS = [
  { id: 'case', label: 'Case' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'risk', label: 'BRE & CIBIL' },
  { id: 'ops', label: 'Operations' },
  { id: 'decision', label: 'Decision' },
];

/** Maps case section ids to permission catalog codes (unmapped sections stay role-gated). */
export const SECTION_PERMISSION_CODE = {
  overview: 'case.overview',
  loan_history: 'case.overview',
  user: 'case.user',
  journey: 'case.journey',
  documents: 'case.documents',
  kyc: 'case.digio_kyc',
  digio_kyc: 'case.digio_kyc',
  verification: 'case.verification',
  bre: 'case.bre',
  payday: 'risk.uw_decisions',
  call_logs: 'case.call_logs',
  history: 'case.history',
  repayments: 'case.repayments',
  breakdown: 'case.breakdown',
  disbursement: 'case.disbursement',
  loan_account: 'case.loan_account',
  actions: 'case.actions',
};

function getRoleSectionIds(role, isRepaymentReview) {
  const r = String(role || '').toLowerCase();
  if (isRepaymentReview) return ['repayments'];
  if (r === 'telecaller') {
    return ['overview', 'loan_history', 'documents', 'call_logs', 'journey'];
  }
  if (r === 'credit_manager') {
    return ['overview', 'loan_history', 'documents', 'cam', 'verification', 'kyc', 'payday', 'aa', 'crif', 'call_logs', 'history', 'loan_account', 'actions'];
  }
  if (r === 'collection_manager') {
    return ['overview', 'loan_history', 'documents', 'kyc', 'verification', 'repayments', 'loan_account', 'history'];
  }
  if (r === 'underwriter' || r === 'approver') {
    return [
      'overview', 'loan_history', 'documents', 'cam', 'verification', 'kyc', 'payday', 'aa', 'crif',
      'call_logs', 'history', 'journey', 'repayments', 'disbursement', 'loan_account', 'actions',
    ];
  }
  if (r === 'operations' || r === 'operations_manager') {
    return [
      'overview', 'loan_history', 'documents', 'cam', 'verification', 'kyc', 'payday', 'aa', 'crif',
      'history', 'repayments', 'disbursement', 'loan_account', 'actions',
    ];
  }
  return [
    'overview', 'loan_history', 'documents', 'cam', 'verification', 'kyc', 'payday', 'aa', 'crif',
    'history', 'call_logs', 'journey', 'repayments', 'disbursement', 'loan_account', 'actions',
  ];
}

function getCustomSectionIds(permissionMap, isRepaymentReview) {
  if (isRepaymentReview) {
    return hasPermission(permissionMap, 'case.repayments', 'can_view') ? ['repayments'] : [];
  }

  const ids = [];
  for (const [sectionId, code] of Object.entries(SECTION_PERMISSION_CODE)) {
    if (sectionId === 'digio_kyc' || sectionId === 'bre') continue;
    if (!hasPermission(permissionMap, code, 'can_view')) continue;
    const normalized = normalizeSectionId(sectionId);
    if (!ids.includes(normalized)) ids.push(normalized);
  }
  return ids;
}


/**
 * Role-filtered section ids.
 * Built-in roles use the role allowlist (sectionConfig) as source of truth.
 * Custom-permission staff use the effective permission map only.
 */
export function getVisibleSectionIds(role, isRepaymentReview, permissionMap, hasCustomPermissions = false) {
  if (hasCustomPermissions) {
    return getCustomSectionIds(permissionMap, isRepaymentReview);
  }
  return getRoleSectionIds(role, isRepaymentReview);
}

export function buildVisibleSections(role, isRepaymentReview, permissionMap, hasCustomPermissions = false) {
  return getVisibleSectionIds(role, isRepaymentReview, permissionMap, hasCustomPermissions)
    .filter((id) => SECTION_META[id])
    .map((id) => ({ id, ...SECTION_META[id] }));
}
