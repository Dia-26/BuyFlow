import type { NextConfig } from "next";
// New generated directory avoids stale webpack chunks left by an interrupted local dev build.
const nextConfig: NextConfig = { distDir: ".next-buyflow-runtime", images: { remotePatterns: [{ protocol: "http", hostname: "**" }, { protocol: "https", hostname: "**" }] } };
export default nextConfig;
