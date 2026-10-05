/**
 * Role-based admin sidebar navigation.
 * Only links to existing routes/APIs; see docs/ROLE_MENU_PHASE2.md for deferred items.
 */

import { DSA_PARTNER_UI_ENABLED } from "@/config/featureFlags"
import { getNavItemPermissionCode } from "@/config/navPermissionMap"
import { hasPermission } from "@/lib/permissionUtils"
import type { PermissionMap } from "@/lib/api/types"

export function normalizeAdminRole(role: unknown) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
}

export interface AdminNavItem {
  id: string
  label: string
  /** May include a query string. */
  path: string
  /** `'all'` or role_code values. */
  roles: string[]
  icon?: string
  badge?: string
}

export interface AdminNavGroup {
  id: string
  label: string
  icon: string
  children: AdminNavItem[]
}

export interface CreditBuckets {
  fresh: boolean
  repeat: boolean
  sanctional: boolean
}

type RawBucketFlag = boolean | number | string | null | undefined

export interface NavFilterOptions {
  creditBuckets?: Partial<Record<keyof CreditBuckets, RawBucketFlag>> | null
  permissionMap?: PermissionMap | null
  hasCustomPermissions?: boolean
}

/** Default CM bucket toggles when Super Admin has not saved a row yet */
export function defaultCreditBuckets(): CreditBuckets {
  return { fresh: true, repeat: true, sanctional: false }
}

export function normalizeCreditBuckets(buckets: NavFilterOptions["creditBuckets"] | unknown): CreditBuckets {
  const defaults = defaultCreditBuckets()
  if (!buckets || typeof buckets !== "object") return defaults
  const b = buckets as Partial<Record<keyof CreditBuckets, RawBucketFlag>>
  return {
    fresh: b.fresh !== false && b.fresh !== 0 && b.fresh !== "0",
    repeat: b.repeat !== false && b.repeat !== 0 && b.repeat !== "0",
    sanctional: !!(b.sanctional && b.sanctional !== "0"),
  }
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: "LayoutDashboard",
    children: [
      { id: "dashboard", label: "Main dashboard", path: "/admin/dashboard", roles: ["all"], icon: "LayoutDashboard" },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    icon: "UserPlus",
    children: [
      { id: "fresh", label: "Fresh", path: "/admin/applications?status=submitted", roles: ["telecaller", "credit_manager", "super_admin", "admin"], icon: "Sparkles" },
      { id: "drafts", label: "Drafts", path: "/admin/applications?status=draft", roles: ["telecaller", "credit_manager", "super_admin", "admin"], icon: "FileText" },
      { id: "all-apps", label: "All applications", path: "/admin/applications", roles: ["all"], icon: "ClipboardList", badge: "applications" },
      { id: "my-apps", label: "My assigned", path: "/admin/applications?assigned=me", roles: ["telecaller", "credit_manager", "underwriter", "operations_manager", "operations"], icon: "UserCheck" },
      { id: "repeat", label: "Repeat customers", path: "/admin/applications?repeat=1", roles: ["telecaller", "credit_manager", "underwriter", "approver", "super_admin", "admin"], icon: "History" },
      { id: "blacklist", label: "Blacklist", path: "/admin/blacklist", roles: ["super_admin", "operations_manager", "credit_manager"], icon: "ShieldBan" },
    ],
  },
  {
    id: "sanction",
    label: "Sanction",
    icon: "Shield",
    children: [
      { id: "under-review", label: "Under review", path: "/admin/applications?status=under_review", roles: ["credit_manager", "super_admin", "admin"], icon: "Eye" },
      { id: "recommended", label: "Recommended", path: "/admin/applications?status=recommended", roles: ["credit_manager", "underwriter", "super_admin", "admin"], icon: "ThumbsUp" },
      { id: "approved", label: "Approved process", path: "/admin/applications?status=approved", roles: ["underwriter", "operations", "operations_manager", "super_admin", "admin"], icon: "ShieldCheck" },
      { id: "rejected", label: "Rejected process", path: "/admin/applications?status=rejected", roles: ["credit_manager", "underwriter", "super_admin", "admin"], icon: "XCircle" },
    ],
  },
  {
    id: "payment",
    label: "Payment",
    icon: "Banknote",
    children: [
      { id: "payout-review", label: "Payout review", path: "/admin/applications?status=payment_pending", roles: ["operations", "operations_manager", "super_admin", "admin", "underwriter", "approver"], icon: "Coins" },
      { id: "disbursal-sheet", label: "Disbursal sheet", path: "/admin/disbursal-sheet", roles: ["operations", "operations_manager", "super_admin", "admin", "underwriter", "approver"], icon: "FileSpreadsheet" },
      { id: "video", label: "Video declarations", path: "/admin/video-declarations", roles: ["super_admin", "operations_manager", "operations", "underwriter", "approver"], icon: "Video" },
      { id: "repayments", label: "Repayments", path: "/admin/repayments", roles: ["super_admin", "operations_manager", "underwriter", "approver"], icon: "Banknote" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "LineChart",
    children: [
      { id: "cm-performance", label: "Credit Manager report", path: "/admin/reports/credit-managers", roles: ["super_admin", "operations_manager", "underwriter"], icon: "LineChart" },
      { id: "telecaller-performance", label: "Telecaller report", path: "/admin/reports/telecallers", roles: ["super_admin", "operations_manager", "underwriter"], icon: "Headset" },
      { id: "uw-performance", label: "Underwriter report", path: "/admin/reports/underwriters", roles: ["super_admin", "operations_manager", "underwriter"], icon: "ClipboardList" },
      { id: "ops-performance", label: "Operations report", path: "/admin/reports/operations", roles: ["super_admin", "operations_manager", "underwriter"], icon: "FileSpreadsheet" },
      { id: "mgmt-funnel", label: "Management funnel", path: "/admin/reports/management-funnel", roles: ["super_admin", "operations_manager", "underwriter"], icon: "Activity" },
      { id: "loan-book-mis", label: "Loan Book MIS", path: "/admin/reports/loan-book", roles: ["super_admin", "operations_manager", "admin"], icon: "FileSpreadsheet" },
      { id: "analytics", label: "Analytics", path: "/admin/analytics", roles: ["super_admin", "operations_manager"], icon: "LineChart" },
      { id: "portfolio", label: "Disbursed portfolio", path: "/admin/analytics?tab=portfolio", roles: ["super_admin", "operations_manager"], icon: "PieChart" },
      { id: "cibil", label: "Credit / CIBIL", path: "/admin/cibil", roles: ["super_admin", "operations_manager"], icon: "Activity" },
      { id: "collection-report", label: "Collection report", path: "/admin/collection?tab=report", roles: ["super_admin", "collection_manager", "operations_manager", "operations", "underwriter"], icon: "TrendingUp" },
    ],
  },
  {
    id: "approval",
    label: "For approval",
    icon: "Check",
    children: [
      { id: "online-payment", label: "Online payment", path: "/admin/repayments?status=under_review", roles: ["super_admin", "operations_manager"], icon: "CreditCard" },
      { id: "settlements", label: "Settlement approvals", path: "/admin/collection?tab=settlements", roles: ["super_admin", "collection_manager", "operations_manager", "underwriter"], icon: "Scale" },
      { id: "reconciliation", label: "Reconciliation", path: "/admin/reconciliation", roles: ["super_admin", "operations_manager"], icon: "BookCheck" },
    ],
  },
  {
    id: "collections",
    label: "Collections",
    icon: "AlertTriangle",
    children: [
      { id: "coll-dashboard", label: "Collections dashboard", path: "/admin/collection?tab=dashboard", roles: ["super_admin", "collection_manager", "operations_manager", "operations", "underwriter"], icon: "AlertTriangle" },
      { id: "overdue", label: "Overdue loans", path: "/admin/collection?tab=overdue", roles: ["super_admin", "collection_manager", "operations_manager", "operations", "underwriter"], icon: "AlertCircle" },
      { id: "ptp", label: "Promise to pay", path: "/admin/collection?tab=ptp", roles: ["super_admin", "collection_manager", "operations_manager", "operations", "underwriter"], icon: "HandCoins" },
    ],
  },
  {
    id: "risk",
    label: "Risk & Credit",
    icon: "Shield",
    children: [
      { id: "bre-mgmt", label: "BRE management", path: "/admin/bre", roles: ["super_admin", "credit_manager"], icon: "Shield" },
      { id: "credit-policy", label: "Credit policy", path: "/admin/credit-policy", roles: ["super_admin", "operations_manager", "credit_manager"], icon: "Shield" },
      { id: "ledger", label: "Ledger book", path: "/admin/ledger", roles: ["super_admin", "operations_manager"], icon: "BookCheck" },
    ],
  },
  {
    id: "dsa",
    label: "DSA Partner",
    icon: "UserPlus",
    children: [
      { id: "dsa-home", label: "Home", path: "/admin/dsa", roles: ["dsa", "sales_manager", "branch_manager", "relationship_manager", "super_admin", "admin"], icon: "LayoutDashboard" },
      { id: "dsa-leads", label: "Leads", path: "/admin/dsa/leads", roles: ["dsa", "sales_manager", "branch_manager", "relationship_manager", "super_admin", "admin"], icon: "Users" },
      { id: "dsa-apps", label: "Applications", path: "/admin/dsa/applications", roles: ["dsa", "sales_manager", "branch_manager", "relationship_manager", "super_admin", "admin"], icon: "ClipboardList" },
      { id: "dsa-comm", label: "Commissions", path: "/admin/dsa/commissions", roles: ["dsa", "sales_manager", "branch_manager", "super_admin", "admin"], icon: "HandCoins" },
      { id: "dsa-reports", label: "Reports", path: "/admin/dsa/reports", roles: ["dsa", "sales_manager", "branch_manager", "super_admin", "admin"], icon: "PieChart" },
      { id: "dsa-settlements", label: "Settlements", path: "/admin/dsa/settlements", roles: ["sales_manager", "branch_manager", "super_admin", "admin"], icon: "Banknote" },
      { id: "dsa-team", label: "Partners & hierarchy", path: "/admin/dsa/team", roles: ["sales_manager", "branch_manager", "relationship_manager", "super_admin", "admin"], icon: "UserCog" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: "Settings",
    children: [
      { id: "users", label: "Users", path: "/admin/users", roles: ["super_admin"], icon: "Users" },
      { id: "staff-users", label: "Staff users", path: "/admin/staff-users", roles: ["super_admin"], icon: "UserCog" },
      { id: "roles", label: "Role management", path: "/admin/roles", roles: ["super_admin"], icon: "UserCog" },
      { id: "credit-buckets", label: "Credit buckets", path: "/admin/credit-buckets", roles: ["super_admin"], icon: "Layers" },
      { id: "products", label: "Loan products", path: "/admin/products", roles: ["super_admin"], icon: "Package" },
    ],
  },
]

export function canSeeNavItem(item: Pick<AdminNavItem, "roles"> | null | undefined, roleKey?: string | null) {
  if (!item?.roles?.length) return false
  if (item.roles.includes("all")) return true
  if (!roleKey) return item.roles.includes("all")
  return item.roles.includes(roleKey)
}

/** Fixed menus. A Reports view toggle must not add Loan Book MIS to these roles. */
const BUILTIN_MENU_ROLES = new Set([
  "super_admin",
  "admin",
  "telecaller",
  "credit_manager",
  "underwriter",
  "approver",
  "operations",
  "operations_manager",
  "collection_manager",
  "dsa_partner",
])

/**
 * Loan Book MIS stays on its role list for built-in menus.
 * A custom role sees it only when Loan Book MIS (admin.reports) view is on.
 */
export function canOpenLoanBookMis(roleKey: unknown, permissionMap?: PermissionMap | null) {
  const key = normalizeAdminRole(roleKey)
  if (key === "super_admin" || key === "operations_manager" || key === "admin") return true
  if (BUILTIN_MENU_ROLES.has(key)) return false
  return hasPermission(permissionMap, "admin.reports", "can_view")
}

function canSeeNavItemWithPermissions(
  item: AdminNavItem,
  roleKey: string | null | undefined,
  permissionMap: PermissionMap | null | undefined,
  hasCustomPermissions = false
) {
  if (!item?.roles?.length) return false
  if (roleKey === "super_admin") return canSeeNavItem(item, roleKey)

  if (item.id === "loan-book-mis") {
    return canOpenLoanBookMis(roleKey, permissionMap)
  }

  const permissionCode = getNavItemPermissionCode(item.id)

  if (hasCustomPermissions) {
    if (!permissionCode) {
      return item.roles.includes("all")
    }
    return hasPermission(permissionMap, permissionCode, "can_view")
  }

  if (permissionCode && permissionMap && Object.keys(permissionMap).length > 0) {
    return hasPermission(permissionMap, permissionCode, "can_view") && canSeeNavItem(item, roleKey)
  }
  return canSeeNavItem(item, roleKey)
}

/** Hide portfolio-wide "All applications" for staff who only get assigned queues */
function shouldHideAllApplications(roleKey: string | null | undefined, item: AdminNavItem) {
  if (item?.id !== "all-apps") return false
  // Underwriter gets portfolio All apps (same as Ops); CM keeps My-bucket only.
  return roleKey === "credit_manager"
}

/**
 * Credit Manager: Leads becomes My bucket; Fresh/Repeat/Sanctional come from Super Admin toggles;
 * hide All applications; keep My assigned + Blacklist.
 */
function applyCreditManagerMyBucket(group: AdminNavGroup, creditBuckets: NavFilterOptions["creditBuckets"]) {
  const flags = normalizeCreditBuckets(creditBuckets)
  const children: AdminNavItem[] = []
  if (flags.fresh) {
    children.push({
      id: "bucket-fresh",
      label: "Fresh",
      path: "/admin/applications?bucket=fresh",
      roles: ["credit_manager"],
      icon: "Sparkles",
    })
  }
  if (flags.repeat) {
    children.push({
      id: "bucket-repeat",
      label: "Repeat",
      path: "/admin/applications?bucket=repeat",
      roles: ["credit_manager", "underwriter", "approver"],
      icon: "History",
    })
  }
  if (flags.sanctional) {
    children.push({
      id: "bucket-sanctional",
      label: "Sanctional",
      path: "/admin/applications?bucket=sanctional",
      roles: ["credit_manager"],
      icon: "Shield",
    })
  }
  for (const child of group.children || []) {
    if (child.id === "my-apps" || child.id === "blacklist") {
      children.push(child)
    }
  }
  return {
    ...group,
    label: "My bucket",
    children,
  }
}

export function filterNavGroups(
  groups: AdminNavGroup[],
  roleKey: string | null | undefined,
  options: NavFilterOptions = {}
): AdminNavGroup[] {
  const { creditBuckets, permissionMap, hasCustomPermissions } = options
  const source = DSA_PARTNER_UI_ENABLED ? groups : groups.filter((g) => g.id !== "dsa")

  if (DSA_PARTNER_UI_ENABLED && roleKey === "dsa") {
    const dsaGroup = source.find((g) => g.id === "dsa")
    if (!dsaGroup) return []
    const children = dsaGroup.children.filter((c) =>
      canSeeNavItemWithPermissions(c, roleKey, permissionMap, hasCustomPermissions)
    )
    return children.length ? [{ ...dsaGroup, children }] : []
  }

  return source
    .map((group) => {
      if (group.id === "leads" && roleKey === "credit_manager") {
        const bucketGroup = applyCreditManagerMyBucket(group, creditBuckets)
        return {
          ...bucketGroup,
          children: bucketGroup.children.filter(
            (c) =>
              canSeeNavItemWithPermissions(c, roleKey, permissionMap, hasCustomPermissions) &&
              !shouldHideAllApplications(roleKey, c)
          ),
        }
      }
      return {
        ...group,
        children: group.children.filter(
          (c) =>
            canSeeNavItemWithPermissions(c, roleKey, permissionMap, hasCustomPermissions) &&
            !shouldHideAllApplications(roleKey, c)
        ),
      }
    })
    .filter((group) => group.children.length > 0)
}

export interface FlatNavItem {
  id: string
  title: string
  path: string
  category: string
  roles: string[]
}

/** Flat list for command palette search */
export function flattenNavItems(
  groups: AdminNavGroup[],
  roleKey: string | null | undefined,
  options: NavFilterOptions = {}
): FlatNavItem[] {
  const filtered = filterNavGroups(groups, roleKey, options)
  const items: FlatNavItem[] = []
  filtered.forEach((group) => {
    group.children.forEach((child) => {
      items.push({
        id: child.id,
        title: child.label,
        path: child.path,
        category: group.label,
        roles: child.roles,
      })
    })
  })
  return items
}
