"use client"

import dynamic from "next/dynamic"
import { RouteLoader } from "@/components/common/RouteLoader"

const NotFound = dynamic(() => import("@/views/NotFound"), { ssr: false, loading: () => <RouteLoader /> })

export default function NotFoundPage() {
  return <NotFound />
}
