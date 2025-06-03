/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure no redirects are interfering with auth routes
  async redirects() {
    return []
  },
  // Ensure auth routes are not treated as dynamic
  async rewrites() {
    return []
  }
}

export default nextConfig
