"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"
import { LoanBookMisGuard } from "@/components/admin/PermissionRouteGuard"

const LoanBookMisPage = dynamic(() => import("@/views/admin/LoanBookMisPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <LoanBookMisGuard>
      <LoanBookMisPage />
    </LoanBookMisGuard>
  )
}
