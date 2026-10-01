"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const BrePolicyVaultGate = dynamic(() => import("@/components/admin/BrePolicyVaultGate"), {
  ssr: false,
  loading: () => <RouteLoader />,
})

const AdminBRE = dynamic(() => import("@/views/admin/AdminBRE"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <BrePolicyVaultGate title="BRE Management">
      <AdminBRE />
    </BrePolicyVaultGate>
  )
}
