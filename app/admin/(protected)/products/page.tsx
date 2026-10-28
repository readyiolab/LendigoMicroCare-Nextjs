import { redirect } from "next/navigation"

/** Loan products catalog removed — CAM policy defaults own package limits/fees. */
export default function Page() {
  redirect("/admin/applications")
}
