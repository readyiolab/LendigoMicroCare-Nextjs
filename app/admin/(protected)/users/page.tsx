"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const AdminUsers = dynamic(() => import("@/views/admin/AdminUsers"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="admin.users">
      <AdminUsers />
    </PermissionRouteGuard>
  )
}
