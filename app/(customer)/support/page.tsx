"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Support = dynamic(() => import("@/views/user/Support"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Support />
}
