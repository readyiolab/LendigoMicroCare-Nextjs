"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const TelecallerReportPage = dynamic(() => import("@/views/admin/TelecallerReportPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <TelecallerReportPage />
}
