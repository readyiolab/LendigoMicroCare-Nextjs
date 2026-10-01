"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const LoanEligibility = dynamic(() => import("@/views/user/LoanEligibility"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <LoanEligibility />
}
