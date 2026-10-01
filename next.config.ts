import type { NextConfig } from "next"

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1"

const nextConfig: NextConfig = {
  output: "standalone",
  // The React app rendered without <StrictMode>; double-invoked effects would also
  // acquire the case-record lock twice on the application detail screen.
  reactStrictMode: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async rewrites() {
    // Same-origin `/api/v1/*` links (e.g. the e-sign agreement fallback) must reach the backend.
    if (!/^https?:\/\//.test(apiBaseUrl)) return []
    return [{ source: "/api/v1/:path*", destination: `${apiBaseUrl}/:path*` }]
  },
}

export default nextConfig
