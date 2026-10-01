"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const AdminCreditBuckets = dynamic(() => import("@/views/admin/AdminCreditBuckets"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <AdminCreditBuckets />
}
