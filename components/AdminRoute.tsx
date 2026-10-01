"use client"

import type { ReactNode } from "react"
import { Navigate } from "@/lib/router"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { Spinner } from "@/components/ui/spinner"

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAdminAuthenticated, loading, tabBlocked } = useAdminAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    )
  }

  // Allow tab blocked overlay to render on the current route without forcing login redirect
  if (tabBlocked) {
    return <>{children}</>
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
