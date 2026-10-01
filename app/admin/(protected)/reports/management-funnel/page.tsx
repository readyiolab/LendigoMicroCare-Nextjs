"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const ManagementFunnelPage = dynamic(() => import("@/views/admin/ManagementFunnelPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <ManagementFunnelPage />
}
