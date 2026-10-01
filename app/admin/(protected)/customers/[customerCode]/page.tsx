"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const CustomerHistoryPage = dynamic(() => import("@/views/admin/CustomerHistoryPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <CustomerHistoryPage />
}
