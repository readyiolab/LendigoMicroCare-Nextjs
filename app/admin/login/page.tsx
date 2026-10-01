"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const AdminLogin = dynamic(() => import("@/views/admin/AdminLogin"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <AdminLogin />
}
