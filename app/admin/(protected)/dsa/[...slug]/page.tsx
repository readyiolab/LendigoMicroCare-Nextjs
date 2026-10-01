import { notFound } from "next/navigation"

/** Unknown DSA paths: the layout redirects while the DSA UI is off, otherwise 404. */
export default function UnknownDsaPage() {
  notFound()
}
