"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaLeads = dynamic(() => import("@/views/admin/dsa/DsaLeads"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaLeads />
}
