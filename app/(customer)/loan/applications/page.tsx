"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const LoanApplications = dynamic(() => import("@/views/user/LoanApplications"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <LoanApplications />
}
