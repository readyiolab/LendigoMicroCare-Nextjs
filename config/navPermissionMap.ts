/**
 * Maps sidebar nav item ids to permission catalog codes.
 * Main dashboard stays unmapped so it remains visible for every role.
 */

export const NAV_ITEM_PERMISSION_CODE: Record<string, string> = {
  fresh: "leads.fresh",
  "bucket-fresh": "leads.fresh",
  drafts: "leads.drafts",
  "all-apps": "leads.all",
  "my-apps": "leads.assigned",
  repeat: "leads.repeat",
  "bucket-repeat": "leads.repeat",
  "bucket-sanctional": "leads.all",
  blacklist: "leads.blacklist",
  "under-review": "sanction.under_review",
  recommended: "sanction.recommended",
  approved: "sanction.approved",
  rejected: "sanction.rejected",
  "payout-review": "payment.payout",
  "disbursal-sheet": "payment.disbursal_sheet",
  video: "payment.video",
  repayments: "payment.repayments",
  "cm-performance": "reports.credit_manager",
  "telecaller-performance": "reports.telecaller",
  "uw-performance": "reports.underwriter",
  "ops-performance": "reports.operations",
  "mgmt-funnel": "reports.funnel",
  "loan-book-mis": "admin.reports",
  analytics: "reports.analytics",
  portfolio: "reports.portfolio",
  cibil: "reports.cibil",
  "collection-report": "reports.collection",
  "online-payment": "approval.online_payment",
  settlements: "approval.settlements",
  reconciliation: "approval.reconciliation",
  "coll-dashboard": "collections.dashboard",
  overdue: "collections.overdue",
  ptp: "collections.ptp",
  "bre-mgmt": "risk.bre",
  "credit-policy": "risk.credit_policy",
  ledger: "risk.ledger",
  "dsa-home": "dsa.home",
  "dsa-leads": "dsa.leads",
  "dsa-apps": "dsa.apps",
  "dsa-comm": "dsa.commissions",
  "dsa-reports": "dsa.reports",
  "dsa-settlements": "dsa.settlements",
  "dsa-team": "dsa.team",
  users: "admin.users",
  "staff-users": "admin.users",
  roles: "admin.roles",
  "credit-buckets": "admin.credit_buckets",
  products: "admin.products",
}

export function getNavItemPermissionCode(itemId: string): string | null {
  return NAV_ITEM_PERMISSION_CODE[itemId] || null
}
