"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const ApplicationDetailsPage = dynamic(() => import("@/views/admin/ApplicationDetailsPage"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <ApplicationDetailsPage />
}
