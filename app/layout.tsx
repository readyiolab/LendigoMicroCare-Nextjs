import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"

import "./globals.css"
import { Providers } from "./providers"

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-outfit",
})

export const metadata: Metadata = {
  title: "LendigoMicrocare | Fast Personal Loans",
  description:
    "Access your LendigoMicrocare account. Fast, secure, and transparent personal loans for your financial needs.",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Browser extensions (screen recorders, Grammarly) add attributes to <html>/<body> before hydration.
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
