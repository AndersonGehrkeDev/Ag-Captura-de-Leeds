import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  logging: { incomingRequests: false },
  // As instruções do projeto são mantidas explicitamente, sem alterações por next dev.
  agentRules: false,
  // Somente os recortes públicos licenciados. Nunca incluir .local-data ou catálogos privados.
  outputFileTracingIncludes: { "/*": ["./data/open/*.json"] },
};

export default nextConfig;
