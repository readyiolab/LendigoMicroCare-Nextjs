"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaDashboard = dynamic(() => import("@/views/admin/dsa/DsaDashboard"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaDashboard />
}
