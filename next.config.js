/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  },
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;

// Made with Bob
