"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"
import { Spinner } from "@/components/ui/spinner"

const BrePolicyVaultGate = dynamic(() => import("@/components/admin/BrePolicyVaultGate"), {
  ssr: false,
  loading: () => <Spinner.Full />,
})

const AdminCreditPolicy = dynamic(() => import("@/views/admin/AdminCreditPolicy"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return (
    <BrePolicyVaultGate title="Credit & re-loan policy">
      <AdminCreditPolicy />
    </BrePolicyVaultGate>
  )
}
