import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  logging: { incomingRequests: false },
  // As instruções do projeto são mantidas explicitamente, sem alterações por next dev.
  agentRules: false,
};

export default nextConfig;
