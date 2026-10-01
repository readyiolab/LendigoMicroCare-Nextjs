"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminLoanProducts = dynamic(() => import("@/views/admin/AdminLoanProducts"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminLoanProducts />
}
