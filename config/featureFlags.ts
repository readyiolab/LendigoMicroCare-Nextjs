/**
 * Feature toggles for admin UI.
 * Flip these without removing DSA code; re-enable when ready.
 */

/** Hide DSA Partner nav, routes, login landing, and DSA roles in staff picker. */
export const DSA_PARTNER_UI_ENABLED: boolean = false

/** Role codes treated as DSA / partner hierarchy (hidden from staff UI when flag is off). */
export const DSA_PARTNER_ROLE_CODES = ["dsa", "sales_manager", "branch_manager", "relationship_manager"]
