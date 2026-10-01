"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const StaffUserFormPage = dynamic(() => import("@/views/admin/StaffUserFormPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="admin.users">
      <StaffUserFormPage />
    </PermissionRouteGuard>
  )
}
