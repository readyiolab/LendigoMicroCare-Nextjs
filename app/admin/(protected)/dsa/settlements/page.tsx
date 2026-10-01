"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaSettlements = dynamic(() => import("@/views/admin/dsa/DsaSettlements"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaSettlements />
}
