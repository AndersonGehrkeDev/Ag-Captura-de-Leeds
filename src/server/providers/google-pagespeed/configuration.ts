import type { ResourceDefinition } from "@/domain/configuration";
import { credential } from "@/server/configuration/rules";

export const pagespeedDefinition = {
  id: "pagespeed",
  label: "PageSpeed Insights",
  purpose: "Auditorias de desempenho de sites com evidências da fonte.",
  fields: [{ name: "GOOGLE_PAGESPEED_API_KEY", schema: credential }],
} as const satisfies ResourceDefinition;
