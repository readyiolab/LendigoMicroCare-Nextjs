"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"
import { PermissionRouteGuard } from "@/components/admin/PermissionRouteGuard"

const AdminRepayments = dynamic(() => import("@/views/admin/AdminRepayments"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return (
    <PermissionRouteGuard permissionCode="payment.repayments">
      <AdminRepayments />
    </PermissionRouteGuard>
  )
}
