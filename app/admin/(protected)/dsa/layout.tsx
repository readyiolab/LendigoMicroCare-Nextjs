import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { DSA_PARTNER_UI_ENABLED } from "@/config/featureFlags"

export default function DsaLayout({ children }: { children: ReactNode }) {
  if (!DSA_PARTNER_UI_ENABLED) {
    redirect("/admin/dashboard")
  }
  return children
}
