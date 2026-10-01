"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const AdminLedgerBook = dynamic(() => import("@/views/admin/AdminLedgerBook"), { ssr: false, loading: () => <Spinner.Full /> })

export default function Page() {
  return <AdminLedgerBook />
}
