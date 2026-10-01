"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const RoleFormPage = dynamic(() => import("@/views/admin/RoleFormPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="admin.roles">
      <RoleFormPage />
    </PermissionRouteGuard>
  )
}
