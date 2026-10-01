"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const AdminRoleManagement = dynamic(() => import("@/views/admin/AdminRoleManagement"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="admin.roles">
      <AdminRoleManagement />
    </PermissionRouteGuard>
  )
}
