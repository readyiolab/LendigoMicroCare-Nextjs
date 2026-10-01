"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const LoanRepayment = dynamic(() => import("@/views/user/LoanRepayment"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <LoanRepayment />
}
