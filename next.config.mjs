/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    output: 'standalone',
    eslint: {
        // Warning: this will disable all ESLint checks during build
        ignoreDuringBuilds: true,
  },
}
  
export default nextConfig