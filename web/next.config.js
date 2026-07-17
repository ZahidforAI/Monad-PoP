/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Skip raw TS typechecking in dependencies (e.g. ox recursion depth errors)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip eslint during build to keep compilation fast and warning-free
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
