"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminCibilReporting = dynamic(() => import("@/views/admin/AdminCibilReporting"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminCibilReporting />
}
