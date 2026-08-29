import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
// Keep generated build output separate from development output, and do not reuse the previously locked cache.
export default function nextConfig(phase:string):NextConfig{return {distDir:phase===PHASE_PRODUCTION_BUILD?".next-buyflow-build-v2":".next-buyflow-dev-v2",images:{remotePatterns:[{protocol:"http",hostname:"**"},{protocol:"https",hostname:"**"}]}};}
