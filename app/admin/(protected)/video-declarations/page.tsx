"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const AdminVideoDeclarations = dynamic(() => import("@/views/admin/AdminVideoDeclarations"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="payment.video">
      <AdminVideoDeclarations />
    </PermissionRouteGuard>
  )
}
