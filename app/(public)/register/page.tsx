"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Register = dynamic(() => import("@/views/auth/Register"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Register />
}
