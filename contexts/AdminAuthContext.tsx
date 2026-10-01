"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react"
import { adminAPI } from "@/lib/api"
import type { AdminSession, PermissionMap } from "@/lib/api/types"
import { onAdminSessionCleared } from "@/lib/services/authEvents"
import { permissionsArrayToMap, type PermissionRow } from "@/lib/permissionUtils"
import { claimTabLock, getOrCreateTabId, releaseTabLock, startTabLockMonitor } from "@/lib/services/singleTabLock"

export interface NormalizedAdminSession extends AdminSession {
  role: string
  role_code: string
  permissions: PermissionRow[]
  permissionMap: PermissionMap
  has_custom_permissions: boolean
}

type RawAdminSession = AdminSession & {
  permissions?: PermissionRow[]
  has_custom_permissions?: unknown
}

export interface AdminAuthContextValue {
  admin: NormalizedAdminSession | null
  loading: boolean
  isAdminAuthenticated: boolean
  tabBlocked: boolean
  adminLogin: (adminData: RawAdminSession | null | undefined) => void
  adminLogout: () => Promise<void>
  clearAdminAuth: () => void
  checkAdminAuth: () => Promise<void>
  claimActiveTab: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
AdminAuthContext.displayName = "AdminAuthContext"

function AdminTabBlockedOverlay({ onUseThisTab }: { onUseThisTab: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 p-6">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Admin session open in another tab</h2>
        <p className="text-sm text-slate-600">Only one admin tab can be active. Close the other tab or continue here.</p>
        <button
          type="button"
          onClick={onUseThisTab}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Use this tab
        </button>
      </div>
    </div>
  )
}

const normalizeAdminRole = (role: unknown) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")

function normalizeAdminSession(adminData: RawAdminSession | null | undefined): NormalizedAdminSession | null {
  if (!adminData) return null
  const role = normalizeAdminRole(adminData.role || adminData.role_code)
  const permissions = adminData.permissions || []
  return {
    ...adminData,
    role,
    role_code: role,
    permissions,
    permissionMap: permissions.length ? permissionsArrayToMap(permissions) : adminData.permissionMap || {},
    has_custom_permissions: !!adminData.has_custom_permissions,
  }
}

function readStoredAdmin(): RawAdminSession | null {
  try {
    const stored = localStorage.getItem("adminData")
    return stored ? (JSON.parse(stored) as RawAdminSession) : null
  } catch {
    return null
  }
}

const statusOf = (err: unknown) => {
  const e = err as { status?: number; response?: { status?: number } } | null
  return e?.status || e?.response?.status
}

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<NormalizedAdminSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [tabBlocked, setTabBlocked] = useState(false)
  // sessionStorage is browser-only, so the tab id is created on first use rather than during render.
  const tabIdRef = useRef<string | null>(null)
  const getTabId = useCallback(() => {
    if (!tabIdRef.current) tabIdRef.current = getOrCreateTabId()
    return tabIdRef.current
  }, [])

  const claimActiveTab = useCallback(() => {
    claimTabLock("admin", getTabId())
    setTabBlocked(false)
  }, [getTabId])

  const handleTabSuperseded = useCallback(() => {
    setTabBlocked(true)
  }, [])

  const adminLogin = useCallback(
    (adminData: RawAdminSession | null | undefined) => {
      if (adminData) {
        const normalized = normalizeAdminSession(adminData)
        localStorage.setItem("adminData", JSON.stringify(normalized))
        claimActiveTab()
        setAdmin(normalized)
        setIsAdminAuthenticated(true)
      } else {
        setAdmin(null)
        setIsAdminAuthenticated(false)
      }
    },
    [claimActiveTab]
  )

  const adminLogout = useCallback(async () => {
    try {
      await adminAPI.adminLogout()
    } catch (error) {
      console.error("Admin logout error:", error)
    } finally {
      releaseTabLock("admin", getTabId())
      localStorage.removeItem("adminData")
      setAdmin(null)
      setIsAdminAuthenticated(false)
      setTabBlocked(false)
    }
  }, [getTabId])

  const clearAdminAuth = useCallback(() => {
    localStorage.removeItem("adminData")
    setAdmin(null)
    setIsAdminAuthenticated(false)
  }, [])

  const checkAdminAuth = useCallback(async () => {
    const storedAdminStr = localStorage.getItem("adminData")
    if (!storedAdminStr) {
      setAdmin(null)
      setIsAdminAuthenticated(false)
      setLoading(false)
      return
    }

    let parsedStoredAdmin: RawAdminSession | null = null
    try {
      parsedStoredAdmin = JSON.parse(storedAdminStr) as RawAdminSession
    } catch {
      parsedStoredAdmin = null
    }

    try {
      let response
      try {
        response = await adminAPI.getProfile()
      } catch (profileErr) {
        const status = statusOf(profileErr)
        if (status === 401) {
          try {
            await adminAPI.adminRefreshToken()
            response = await adminAPI.getProfile()
          } catch (refreshErr) {
            const refreshStatus = statusOf(refreshErr)
            // Only invalidate if refresh is explicitly rejected as unauthorized/forbidden
            if (refreshStatus === 401 || refreshStatus === 403) {
              localStorage.removeItem("adminData")
              setAdmin(null)
              setIsAdminAuthenticated(false)
              return
            }
            // Transient failure during refresh (e.g. 429 rate limit, 502/503 server reload): keep session
            if (parsedStoredAdmin) {
              setAdmin(normalizeAdminSession(parsedStoredAdmin))
              setIsAdminAuthenticated(true)
              claimActiveTab()
              return
            }
            throw refreshErr
          }
        } else if (status === 403) {
          localStorage.removeItem("adminData")
          setAdmin(null)
          setIsAdminAuthenticated(false)
          return
        } else {
          // Non-auth error (429, offline, 500): keep the stored session so reload works seamlessly
          if (parsedStoredAdmin) {
            setAdmin(normalizeAdminSession(parsedStoredAdmin))
            setIsAdminAuthenticated(true)
            claimActiveTab()
            return
          }
          throw profileErr
        }
      }

      if (response && response.status === 1) {
        const fresh = (response.data || {}) as RawAdminSession
        const merged = normalizeAdminSession({
          ...(parsedStoredAdmin || {}),
          ...fresh,
        })
        localStorage.setItem("adminData", JSON.stringify(merged))
        claimActiveTab()
        setAdmin(merged)
        setIsAdminAuthenticated(true)
      } else {
        localStorage.removeItem("adminData")
        setAdmin(null)
        setIsAdminAuthenticated(false)
      }
    } catch (err) {
      const status = statusOf(err)
      if (status === 401 || status === 403) {
        localStorage.removeItem("adminData")
        setAdmin(null)
        setIsAdminAuthenticated(false)
      } else if (parsedStoredAdmin) {
        // Keep user logged in despite temporary network/rate-limit error
        setAdmin(normalizeAdminSession(parsedStoredAdmin))
        setIsAdminAuthenticated(true)
        claimActiveTab()
      }
      console.error("[AdminAuth] Session check failed:", (err as { message?: string } | null)?.message || err)
    } finally {
      setLoading(false)
    }
  }, [claimActiveTab])

  /* eslint-disable react-hooks/set-state-in-effect -- window.location and localStorage are only readable after hydration */
  useEffect(() => {
    // Customer app routes: never probe /admin/profile (avoids redirect to admin login after customer OTP)
    if (!window.location.pathname.startsWith("/admin")) {
      if (localStorage.getItem("adminData")) {
        localStorage.removeItem("adminData")
        localStorage.removeItem("adminRole")
      }
      setAdmin(null)
      setIsAdminAuthenticated(false)
      setLoading(false)
      return
    }
    const stored = readStoredAdmin()
    setAdmin(normalizeAdminSession(stored))
    setIsAdminAuthenticated(Boolean(localStorage.getItem("adminData")))
    checkAdminAuth()
  }, [checkAdminAuth])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isAdminAuthenticated || !window.location.pathname.startsWith("/admin")) return undefined
    return startTabLockMonitor({
      scope: "admin",
      tabId: getTabId(),
      onSuperseded: handleTabSuperseded,
    })
  }, [isAdminAuthenticated, handleTabSuperseded, getTabId])

  useEffect(
    () =>
      onAdminSessionCleared(() => {
        localStorage.removeItem("adminData")
        setAdmin(null)
        setIsAdminAuthenticated(false)
        setTabBlocked(false)
      }),
    []
  )

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      loading,
      isAdminAuthenticated,
      tabBlocked,
      adminLogin,
      adminLogout,
      clearAdminAuth,
      checkAdminAuth,
      claimActiveTab,
    }),
    [
      admin,
      loading,
      isAdminAuthenticated,
      tabBlocked,
      adminLogin,
      adminLogout,
      clearAdminAuth,
      checkAdminAuth,
      claimActiveTab,
    ]
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
      {tabBlocked && <AdminTabBlockedOverlay onUseThisTab={claimActiveTab} />}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider")
  }
  return context
}
