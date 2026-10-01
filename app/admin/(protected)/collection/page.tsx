"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminCollections = dynamic(() => import("@/views/admin/AdminCollections"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminCollections />
}
