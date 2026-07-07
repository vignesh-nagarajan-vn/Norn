/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Norn has no bundled linter config; type errors still fail the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
