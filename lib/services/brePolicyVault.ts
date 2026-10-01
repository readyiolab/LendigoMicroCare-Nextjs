/** In-memory vault token, shared while navigating between protected admin pages. */
let memoryVaultToken = ""

const VAULT_REQUIRED_CACHE_KEY = "bre_vault_required"

const VAULT_ADMIN_PATHS = ["/admin/bre", "/admin/credit-policy", "/admin/settings"]

export function isVaultProtectedAdminPath(pathname = "") {
  if (!pathname) return false
  return VAULT_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function getBrePolicyVaultToken() {
  return memoryVaultToken || ""
}

export function setBrePolicyVaultToken(token: unknown) {
  memoryVaultToken = token ? String(token) : ""
}

export function clearBrePolicyVaultToken() {
  memoryVaultToken = ""
}

export function getCachedVaultRequired(): boolean | null {
  try {
    const v = sessionStorage.getItem(VAULT_REQUIRED_CACHE_KEY)
    if (v === "1") return true
    if (v === "0") return false
  } catch {
    /* ignore */
  }
  return null
}

export function setCachedVaultRequired(required: boolean) {
  try {
    sessionStorage.setItem(VAULT_REQUIRED_CACHE_KEY, required ? "1" : "0")
  } catch {
    /* ignore */
  }
}

export function urlNeedsBrePolicyVault(url = "") {
  if (!url) return false
  const path = url.split("?")[0]
  if (path.includes("/admin/bre/vault/")) return false
  if (/\/admin\/bre\/(rules|policies|history)/.test(path)) return true
  if (path.includes("/admin/bre/admin/simulate")) return true
  if (path.includes("/admin/credit-policy/settings")) return true
  return false
}
