"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaReports = dynamic(() => import("@/views/admin/dsa/DsaReports"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaReports />
}
