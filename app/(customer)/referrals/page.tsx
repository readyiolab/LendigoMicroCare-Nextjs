"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Referrals = dynamic(() => import("@/views/user/Referrals"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Referrals />
}
