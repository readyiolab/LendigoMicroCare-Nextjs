"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const AdminDisbursalSheet = dynamic(() => import("@/views/admin/AdminDisbursalSheet"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="payment.disbursal_sheet">
      <AdminDisbursalSheet />
    </PermissionRouteGuard>
  )
}
