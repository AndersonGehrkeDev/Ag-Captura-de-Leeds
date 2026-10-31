import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**", "out/**", "coverage/**", ".npm-cache/**", ".local-data/**",
    "playwright-report/**", "test-results/**", "next-env.d.ts",
  ]),
  {
    files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^@/server(?:$|/(?!auth/(?:actions|workspace-actions)$))",
          message: "Componha dados de servidor nas rotas App Router; funcionalidades e UI não devem importar adaptadores de provedores.",
        }],
      }],
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server/**", "@/components/**", "next", "next/**", "react", "react/**"],
          message: "O domínio deve permanecer independente da interface, framework e provedores.",
        }],
      }],
    },
  },
]);
