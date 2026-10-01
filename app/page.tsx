"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Navigate } from "@/lib/router"
import { RouteLoader } from "@/components/common/RouteLoader"

export default function RootRedirect() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return <RouteLoader />
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
}
