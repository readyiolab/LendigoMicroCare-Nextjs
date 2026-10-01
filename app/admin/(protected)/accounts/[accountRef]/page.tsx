"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Account360Page = dynamic(() => import("@/views/admin/Account360Page"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Account360Page />
}
