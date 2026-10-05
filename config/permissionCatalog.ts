/**
 * Permission catalog: single source of truth for staff/role module access.
 * Mirrors fintech-backend/config/permissionCatalog.js
 */

export interface PermissionSubmodule {
  code: string
  label: string
}

export interface PermissionModule {
  id: string
  label: string
  submodules: PermissionSubmodule[]
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "leads",
    label: "Leads",
    submodules: [
      { code: "leads.fresh", label: "Fresh" },
      { code: "leads.all", label: "All applications" },
      { code: "leads.assigned", label: "My assigned" },
      { code: "leads.repeat", label: "Repeat customers" },
      { code: "leads.blacklist", label: "Blacklist" },
    ],
  },
  {
    id: "sanction",
    label: "Sanction",
    submodules: [
      { code: "sanction.under_review", label: "Under review" },
      { code: "sanction.recommended", label: "Recommended" },
      { code: "sanction.approved", label: "Approved process" },
      { code: "sanction.rejected", label: "Rejected process" },
    ],
  },
  {
    id: "payment",
    label: "Payment",
    submodules: [
      { code: "payment.payout", label: "Payout review" },
      { code: "payment.disbursal_sheet", label: "Disbursal sheet" },
      { code: "payment.video", label: "Video declarations" },
      { code: "payment.repayments", label: "Repayments" },
    ],
  },
  {
    id: "case",
    label: "Profile / Case",
    submodules: [
      { code: "case.overview", label: "Summary" },
      { code: "case.user", label: "Customer" },
      { code: "case.journey", label: "Steps" },
      { code: "case.documents", label: "Documents" },
      { code: "case.digio_kyc", label: "ID check" },
      { code: "case.verification", label: "Video Declaration" },
      { code: "case.bre", label: "Risk" },
      { code: "case.call_logs", label: "Calls" },
      { code: "case.history", label: "Activity" },
      { code: "case.repayments", label: "Payments" },
      { code: "case.breakdown", label: "Charges" },
      { code: "case.disbursement", label: "Pay out" },
      { code: "case.loan_account", label: "Loan account" },
      { code: "case.actions", label: "Decision" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    submodules: [
      { code: "admin.users", label: "Users" },
      { code: "admin.roles", label: "Role management" },
      { code: "admin.settings", label: "Settings" },
      { code: "admin.reports", label: "Loan Book MIS" },
    ],
  },
]

export const SYSTEM_TOGGLES: PermissionSubmodule[] = [
  { code: "system.change_password", label: "Change Password" },
  { code: "system.manage_access", label: "Manage Access" },
  { code: "system.export_pdf", label: "Export PDF" },
  { code: "system.bucket_access", label: "Bucket Access" },
  { code: "system.payment_dates_block", label: "Payment Dates Block" },
  { code: "system.unmask_pii", label: "Unmask PII" },
]

export function getAllPermissionCodes(): string[] {
  const codes: string[] = []
  for (const mod of PERMISSION_MODULES) {
    for (const sub of mod.submodules) {
      codes.push(sub.code)
    }
  }
  for (const toggle of SYSTEM_TOGGLES) {
    codes.push(toggle.code)
  }
  return codes
}

export function getCatalog() {
  return {
    modules: PERMISSION_MODULES,
    systemToggles: SYSTEM_TOGGLES,
    allCodes: getAllPermissionCodes(),
  }
}
