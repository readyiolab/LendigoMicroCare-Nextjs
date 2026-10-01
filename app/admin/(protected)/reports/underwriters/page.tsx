"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const UnderwriterReportPage = dynamic(() => import("@/views/admin/UnderwriterReportPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <UnderwriterReportPage />
}
