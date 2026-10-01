"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminDashboard = dynamic(() => import("@/views/admin/AdminDashboard"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminDashboard />
}
