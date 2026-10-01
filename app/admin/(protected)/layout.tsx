"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import { AdminRoute } from "@/components/AdminRoute"
import { RouteLoader } from "@/components/common/RouteLoader"
import { OutletSlot } from "@/lib/router"

const AdminLayout = dynamic(() => import("@/components/layouts/AdminLayout"), {
  ssr: false,
  loading: () => <RouteLoader />,
})

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminRoute>
      <OutletSlot content={children}>
        <AdminLayout />
      </OutletSlot>
    </AdminRoute>
  )
}
