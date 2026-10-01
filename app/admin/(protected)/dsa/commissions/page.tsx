"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaCommissions = dynamic(() => import("@/views/admin/dsa/DsaCommissions"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaCommissions />
}
