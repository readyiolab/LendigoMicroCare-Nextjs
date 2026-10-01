"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Dashboard = dynamic(() => import("@/views/user/Dashboard"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Dashboard />
}
