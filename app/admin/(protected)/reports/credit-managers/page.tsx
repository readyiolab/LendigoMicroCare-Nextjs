"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const CreditManagerReportPage = dynamic(() => import("@/views/admin/CreditManagerReportPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <CreditManagerReportPage />
}
