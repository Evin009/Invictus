import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  serverExternalPackages: ["pdf-parse", "mammoth", "canvas"],
};

export default nextConfig;
