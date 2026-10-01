"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Documents = dynamic(() => import("@/views/user/Documents"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Documents />
}
