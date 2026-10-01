"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaApplicationStatus = dynamic(() => import("@/views/admin/dsa/DsaApplicationStatus"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaApplicationStatus />
}
