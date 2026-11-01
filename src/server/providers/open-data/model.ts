import { createHash } from "node:crypto";
import { z } from "zod";

export const osmSourceId = "53c382fe-d654-4d6a-b0e7-07d8cd7bd040";
export const osmPolicyId = "bd5613ae-96fe-4f70-96ce-6b3f6fba7c31";
export const overtureSourceId = "c8750c81-fef5-459b-a3b5-8504b29e8a70";
export const overturePolicyId = "7eaebdc8-51fa-4eb4-b4b5-81b64cbe10db";
export const overtureRelease = "2026-10-21.0";
export const overtureCredit = `Overture Maps / Meta / Microsoft · Places ${overtureRelease} · CDLA-Permissive-2.0 · https://docs.overturemaps.org/attribution/#places · licença: /licencas/CDLA-Permissive-2.0.txt`;
export const osmCredit = "© OpenStreetMap contributors · ODbL 1.0 · https://www.openstreetmap.org/copyright · consulta via Private.coffee";
export const ibgeCredit = "Municípios: IBGE / API de Localidades · https://servicodados.ibge.gov.br/api/docs/localidades";
export const openRecordSchema = z.strictObject({
  origin: z.enum(["osm", "overture"]).default("osm"),
  reference: z.string().regex(/^(?:(?:node|way|relation)\/[1-9]\d{0,15}|overture\/[0-9a-f-]{36})$/), name: z.string().min(1).max(200), category: z.string().min(1).max(100),
  website: z.url().max(2048).nullable(), address: z.string().max(500).nullable(), city: z.string().min(2).max(120),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), observedAt: z.iso.datetime({ offset: true }),
});
export type OpenRecord = z.infer<typeof openRecordSchema>;
export const openCacheSchema = z.strictObject({ records: z.array(openRecordSchema).max(60), limited: z.boolean(), observedAt: z.iso.datetime({ offset: true }) });
export type OpenCache = z.infer<typeof openCacheSchema>;
export function openDataId(key: string) {
  const bytes = createHash("sha256").update(`ag-osm:${key}`).digest(); bytes[6] = (bytes[6]! & 15) | 80; bytes[8] = (bytes[8]! & 63) | 128;
  const hex = bytes.toString("hex").slice(0, 32); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
