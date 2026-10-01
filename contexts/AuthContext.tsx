"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react"
import { authAPI } from "@/lib/api"
import type { ApiResponse, CustomerUser } from "@/lib/api/types"
import { onCustomerSessionCleared } from "@/lib/services/authEvents"
import { claimTabLock, getOrCreateTabId, releaseTabLock, startTabLockMonitor } from "@/lib/services/singleTabLock"

export interface AuthContextValue {
  user: CustomerUser | null
  loading: boolean
  isAuthenticated: boolean
  tabBlocked: boolean
  login: (userData: CustomerUser) => void
  logout: () => Promise<void>
  updateUser: (userData: CustomerUser | null) => void
  checkAuth: () => Promise<void>
  claimActiveTab: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function TabBlockedOverlay({ onUseThisTab }: { onUseThisTab: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 p-6">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Account open in another tab</h2>
        <p className="text-sm text-slate-600">
          Only one browser tab can be active at a time. Close the other tab or continue here.
        </p>
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

type SessionData = CustomerUser & { user?: CustomerUser; profile?: unknown }

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tabBlocked, setTabBlocked] = useState(false)
  // sessionStorage is browser-only, so the tab id is created on first use rather than during render.
  const tabIdRef = useRef<string | null>(null)
  const getTabId = useCallback(() => {
    if (!tabIdRef.current) tabIdRef.current = getOrCreateTabId()
    return tabIdRef.current
  }, [])

  const claimActiveTab = useCallback(() => {
    claimTabLock("customer", getTabId())
    setTabBlocked(false)
  }, [getTabId])

  const handleTabSuperseded = useCallback(() => {
    setTabBlocked(true)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const login = useCallback(
    (userData: CustomerUser) => {
      localStorage.removeItem("adminData")
      localStorage.removeItem("adminRole")
      claimActiveTab()
      setUser(userData)
      setIsAuthenticated(true)
    },
    [claimActiveTab]
  )

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      releaseTabLock("customer", getTabId())
      setUser(null)
      setIsAuthenticated(false)
      setTabBlocked(false)
    }
  }, [getTabId])

  const updateUser = useCallback((userData: CustomerUser | null) => {
    setUser(userData)
  }, [])

  const checkAuth = useCallback(async () => {
    const applySession = (response: ApiResponse<SessionData> | undefined) => {
      if (response?.status === 1) {
        localStorage.removeItem("adminData")
        localStorage.removeItem("adminRole")
        claimActiveTab()
        let userData = (response.data?.user || response.data) as CustomerUser
        if (response.data?.profile) {
          userData = { ...userData, profile: response.data.profile }
        }
        setUser(userData)
        setIsAuthenticated(true)
        return true
      }
      return false
    }

    try {
      const response = await authAPI.getCurrentUser()
      if (applySession(response as ApiResponse<SessionData>)) return
    } catch {
      try {
        await authAPI.refreshToken()
        const response = await authAPI.getCurrentUser()
        if (applySession(response as ApiResponse<SessionData>)) return
      } catch {
        /* session fully expired */
      }
    }

    setUser(null)
    setIsAuthenticated(false)
  }, [claimActiveTab])

  /* eslint-disable react-hooks/set-state-in-effect -- window.location is only readable after hydration */
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) {
      setLoading(false)
      return
    }
    if (window.location.pathname.startsWith("/verify-selfie")) {
      setLoading(false)
      setUser(null)
      setIsAuthenticated(false)
      return
    }
    checkAuth().finally(() => setLoading(false))
  }, [checkAuth])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isAuthenticated || window.location.pathname.startsWith("/admin")) return undefined
    return startTabLockMonitor({
      scope: "customer",
      tabId: getTabId(),
      onSuperseded: handleTabSuperseded,
    })
  }, [isAuthenticated, handleTabSuperseded, getTabId])

  useEffect(
    () =>
      onCustomerSessionCleared(() => {
        setUser(null)
        setIsAuthenticated(false)
        setTabBlocked(false)
      }),
    []
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated,
      tabBlocked,
      login,
      logout,
      updateUser,
      checkAuth,
      claimActiveTab,
    }),
    [user, loading, isAuthenticated, tabBlocked, login, logout, updateUser, checkAuth, claimActiveTab]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {tabBlocked && <TabBlockedOverlay onUseThisTab={claimActiveTab} />}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
