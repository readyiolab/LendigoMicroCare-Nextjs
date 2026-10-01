"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const StaffUserListPage = dynamic(() => import("@/views/admin/StaffUserListPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="admin.users">
      <StaffUserListPage />
    </PermissionRouteGuard>
  )
}
