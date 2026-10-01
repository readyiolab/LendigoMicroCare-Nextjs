"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"
import { OutletSlot } from "@/lib/router"

const AdminApplications = dynamic(() => import("@/views/admin/AdminApplications"), {
  ssr: false,
  loading: () => <Spinner.Full />,
})

/** Keeps the list mounted while a case is open, like the nested react-router route did. */
export default function ApplicationsListLayout({ children }: { children: ReactNode }) {
  return (
    <OutletSlot content={children}>
      <AdminApplications />
    </OutletSlot>
  )
}
