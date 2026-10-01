"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const CaseManagement = dynamic(() => import("@/views/admin/CaseManagement"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <CaseManagement />
}
