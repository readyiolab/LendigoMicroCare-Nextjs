"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const VerifySelfie = dynamic(() => import("@/views/auth/VerifySelfie"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <VerifySelfie />
}
