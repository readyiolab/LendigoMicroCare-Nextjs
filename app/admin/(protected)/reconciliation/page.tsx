"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminReconciliation = dynamic(() => import("@/views/admin/AdminReconciliation"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminReconciliation />
}
