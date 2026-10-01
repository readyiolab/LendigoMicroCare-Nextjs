/**
 * Maps sidebar nav item ids to permission catalog codes.
 * Items without a mapping stay role-gated (Reports, Collections, etc.).
 */

export const NAV_ITEM_PERMISSION_CODE: Record<string, string> = {
  fresh: "leads.fresh",
  "bucket-fresh": "leads.fresh",
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
  users: "admin.users",
  "staff-users": "admin.users",
  roles: "admin.roles",
}

export function getNavItemPermissionCode(itemId: string): string | null {
  return NAV_ITEM_PERMISSION_CODE[itemId] || null
}
