"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Setup2FA = dynamic(() => import("@/views/auth/Setup2FA"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Setup2FA />
}
