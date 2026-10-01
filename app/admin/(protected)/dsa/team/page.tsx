"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaTeam = dynamic(() => import("@/views/admin/dsa/DsaTeam"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaTeam />
}
