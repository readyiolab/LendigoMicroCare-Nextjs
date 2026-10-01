"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const AdminBlacklist = dynamic(() => import("@/views/admin/AdminBlacklist"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="leads.blacklist">
      <AdminBlacklist />
    </PermissionRouteGuard>
  )
}
