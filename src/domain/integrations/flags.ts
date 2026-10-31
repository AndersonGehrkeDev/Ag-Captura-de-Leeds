import { z } from "zod";

const flag = z.boolean().default(false);
export const integrationFlagsSchema = z.strictObject({
  catalogSearch: flag, catalogDetails: flag, googlePlaces: flag, googleMaps: flag,
  websiteAudit: flag, aiMessages: flag, ownPersistence: flag, exports: flag,
});
export type IntegrationFlags = Readonly<z.infer<typeof integrationFlagsSchema>>;
export const disabledIntegrationFlags: IntegrationFlags = integrationFlagsSchema.parse({});
export function readIntegrationFlags(env: Readonly<Record<string, string | undefined>>): IntegrationFlags {
  return integrationFlagsSchema.parse({
    catalogSearch: env.FEATURE_CATALOG_SEARCH === "true", catalogDetails: env.FEATURE_CATALOG_DETAILS === "true",
    googlePlaces: env.FEATURE_GOOGLE_PLACES === "true", googleMaps: env.FEATURE_GOOGLE_MAPS === "true",
    websiteAudit: env.FEATURE_WEBSITE_AUDIT === "true", aiMessages: env.FEATURE_AI_MESSAGES === "true",
    ownPersistence: env.FEATURE_OWN_DATA_PERSISTENCE === "true", exports: env.FEATURE_DATA_EXPORT === "true",
  });
}
