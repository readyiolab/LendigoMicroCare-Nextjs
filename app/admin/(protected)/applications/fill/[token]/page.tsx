"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminAssistedApplication = dynamic(() => import("@/views/admin/AdminAssistedApplication"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminAssistedApplication />
}
