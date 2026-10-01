import { PERMISSION_MODULES, SYSTEM_TOGGLES, getAllPermissionCodes } from "@/config/permissionCatalog"
import type { PermissionAccess, PermissionAction, PermissionMap } from "@/lib/api/types"

export type { PermissionAccess, PermissionAction, PermissionMap }

type Flag = boolean | number | null | undefined

export interface PermissionRow {
  permission_code?: string
  can_view?: Flag
  can_create?: Flag
  can_edit?: Flag
  can_delete?: Flag
}

export const PERM_ACTIONS: PermissionAction[] = ["can_view", "can_create", "can_edit", "can_delete"]
export const PERM_ACTION_LABELS: Record<PermissionAction, string> = {
  can_view: "View",
  can_create: "Add",
  can_edit: "Edit",
  can_delete: "Delete",
}

const emptyAccess = (): PermissionAccess => ({
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
})

export function buildEmptyPermissionMap(): PermissionMap {
  const map: PermissionMap = {}
  for (const code of getAllPermissionCodes()) {
    map[code] = emptyAccess()
  }
  return map
}

export function permissionsArrayToMap(permissions: PermissionRow[] = []): PermissionMap {
  const map = buildEmptyPermissionMap()
  for (const p of permissions) {
    if (!p?.permission_code) continue
    map[p.permission_code] = {
      can_view: !!p.can_view,
      can_create: !!p.can_create,
      can_edit: !!p.can_edit,
      can_delete: !!p.can_delete,
    }
  }
  return map
}

export function permissionMapToArray(map: Partial<Record<string, Partial<PermissionAccess>>> = {}) {
  return Object.entries(map)
    .filter(([, access]) => access?.can_view || access?.can_create || access?.can_edit || access?.can_delete)
    .map(([code, access]) => ({
      permission_code: code,
      can_view: access?.can_view ? 1 : 0,
      can_create: access?.can_create ? 1 : 0,
      can_edit: access?.can_edit ? 1 : 0,
      can_delete: access?.can_delete ? 1 : 0,
    }))
}

/** Serialize every catalog code; used when saving custom staff overrides (including explicit denials). */
export function permissionMapToFullArray(map: Partial<Record<string, Partial<PermissionAccess>>> = {}) {
  return getAllPermissionCodes().map((code) => {
    const access = map[code] || {}
    return {
      permission_code: code,
      can_view: access.can_view ? 1 : 0,
      can_create: access.can_create ? 1 : 0,
      can_edit: access.can_edit ? 1 : 0,
      can_delete: access.can_delete ? 1 : 0,
    }
  })
}

export function hasPermission(
  permissionMap: Partial<Record<string, Partial<PermissionAccess>>> | null | undefined,
  code: string | null | undefined,
  action: PermissionAction = "can_view"
) {
  if (!permissionMap || !code) return false
  return !!permissionMap[code]?.[action]
}

export function countPermissionSummary(map: Partial<Record<string, Partial<PermissionAccess>>> = {}) {
  const total = getAllPermissionCodes().length
  const counts: Record<PermissionAction, number> = { can_view: 0, can_create: 0, can_edit: 0, can_delete: 0 }
  for (const code of getAllPermissionCodes()) {
    const access = map[code] || {}
    for (const action of PERM_ACTIONS) {
      if (access[action]) counts[action] += 1
    }
  }
  return { counts, total }
}

export function setPermissionAction(
  map: PermissionMap,
  code: string,
  action: PermissionAction,
  value: unknown
): PermissionMap {
  const next = { ...map }
  const current = { ...(next[code] || emptyAccess()) }
  current[action] = !!value
  if (action === "can_view" && !value) {
    current.can_create = false
    current.can_edit = false
    current.can_delete = false
  }
  if ((action === "can_create" || action === "can_edit" || action === "can_delete") && value) {
    current.can_view = true
  }
  next[code] = current
  return next
}

export function setAllForSubmodule(map: PermissionMap, code: string, value: unknown): PermissionMap {
  let next = { ...map }
  for (const action of PERM_ACTIONS) {
    next = setPermissionAction(next, code, action, value)
  }
  return next
}

export function setAllForModule(map: PermissionMap, moduleId: string, value: unknown): PermissionMap {
  const mod = PERMISSION_MODULES.find((m) => m.id === moduleId)
  if (!mod) return map
  let next = { ...map }
  for (const sub of mod.submodules) {
    next = setAllForSubmodule(next, sub.code, value)
  }
  return next
}

export function grantFullControl(): PermissionMap {
  const map = buildEmptyPermissionMap()
  for (const code of getAllPermissionCodes()) {
    map[code] = { can_view: true, can_create: true, can_edit: true, can_delete: true }
  }
  return map
}

/** UI status mapping */
export const UI_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blocked", label: "Suspended" },
]

export function dbStatusToUi(status: unknown) {
  if (status === "blocked") return "Suspended"
  if (status === "inactive") return "Inactive"
  return "Active"
}

export function uiStatusToDb(label: unknown) {
  if (label === "Suspended") return "blocked"
  if (label === "Inactive") return "inactive"
  return "active"
}

export { PERMISSION_MODULES, SYSTEM_TOGGLES, getAllPermissionCodes }
