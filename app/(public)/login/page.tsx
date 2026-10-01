"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const Login = dynamic(() => import("@/views/auth/Login"), { ssr: false, loading: () => <RouteLoader /> })

export default function Page() {
  return <Login />
}
