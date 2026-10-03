"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const LoanBookMisPage = dynamic(() => import("@/views/admin/LoanBookMisPage"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <LoanBookMisPage />
}
