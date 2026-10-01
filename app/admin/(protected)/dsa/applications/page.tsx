"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const DsaApplications = dynamic(() => import("@/views/admin/dsa/DsaApplications"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <DsaApplications />
}
