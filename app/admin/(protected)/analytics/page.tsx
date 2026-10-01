"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminOperationsAnalytics = dynamic(() => import("@/views/admin/AdminOperationsAnalytics"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminOperationsAnalytics />
}
