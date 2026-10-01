"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Account = dynamic(() => import("@/views/user/Account"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Account />
}
