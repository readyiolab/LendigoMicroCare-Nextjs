"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const OperationsReportPage = dynamic(() => import("@/views/admin/OperationsReportPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <OperationsReportPage />
}
