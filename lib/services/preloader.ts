/**
 * Preloader utility to trigger dynamic imports ahead of time.
 * The imported view modules share chunks with the route pages, so warming them
 * here makes the following navigation instant.
 */
const routeImports: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/views/user/Dashboard"),
  "/loan/applications": () => import("@/views/user/LoanApplications"),
  "/repayment": () => import("@/views/user/LoanRepayment"),
  "/account": () => import("@/views/user/Account"),
  "/account/2fa": () => import("@/views/auth/Setup2FA"),
  "/referrals": () => import("@/views/user/Referrals"),
  "/support": () => import("@/views/user/Support"),
  "/admin": () => import("@/views/admin/AdminDashboard"),
  "/admin/dashboard": () => import("@/views/admin/AdminDashboard"),
  "/admin/users": () => import("@/views/admin/AdminUsers"),
  "/admin/applications": () => import("@/views/admin/AdminApplications"),
  "/admin/applications/detail": () => import("@/views/admin/ApplicationDetailsPage"),
  "/admin/repayments": () => import("@/views/admin/AdminRepayments"),
  "/admin/reconciliation": () => import("@/views/admin/AdminReconciliation"),
  "/admin/bre": () => import("@/views/admin/AdminBRE"),
  "/admin/roles": () => import("@/views/admin/AdminRoleManagement"),
  "/admin/products": () => import("@/views/admin/AdminLoanProducts"),
  "/admin/collection": () => import("@/views/admin/AdminCollections"),
  "/admin/cases": () => import("@/views/admin/CaseManagement"),
  "/admin/ledger": () => import("@/views/admin/AdminLedgerBook"),
  "/admin/video-declarations": () => import("@/views/admin/AdminVideoDeclarations"),
  "/admin/analytics": () => import("@/views/admin/AdminOperationsAnalytics"),
  "/admin/blacklist": () => import("@/views/admin/AdminBlacklist"),
  "/admin/credit-policy": () => import("@/views/admin/AdminCreditPolicy"),
  "/admin/credit-buckets": () => import("@/views/admin/AdminCreditBuckets"),
  "/admin/settings": () => import("@/views/admin/AdminCreditPolicy"),
  "/admin/cibil": () => import("@/views/admin/AdminCibilReporting"),
  "/admin/dsa": () => import("@/views/admin/dsa/DsaDashboard"),
  "/admin/dsa/leads": () => import("@/views/admin/dsa/DsaLeads"),
  "/admin/dsa/applications": () => import("@/views/admin/dsa/DsaApplications"),
  "/admin/dsa/commissions": () => import("@/views/admin/dsa/DsaCommissions"),
  "/admin/dsa/reports": () => import("@/views/admin/dsa/DsaReports"),
  "/admin/dsa/settlements": () => import("@/views/admin/dsa/DsaSettlements"),
  "/admin/dsa/team": () => import("@/views/admin/dsa/DsaTeam"),
}

export const preloadRoute = (path: string | null | undefined) => {
  if (!path) return
  const cleanPath = path.split("?")[0]
  const importer = routeImports[cleanPath]
  if (importer) {
    importer().catch(() => {})
  }
}
