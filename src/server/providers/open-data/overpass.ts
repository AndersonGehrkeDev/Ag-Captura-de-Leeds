import "server-only";
import { z } from "zod";
import { normalizeSearchText } from "@/domain/integrations/categories";
import type { SearchRequest, IntegrationErrorCode } from "@/domain/integrations/contracts";
import { openCacheSchema, type OpenCache, type OpenRecord } from "./model";

export class OpenDataError extends Error { constructor(readonly code: IntegrationErrorCode, readonly publicMessage?: string) { super(code); } }
const endpoint = "https://overpass.private.coffee/api/interpreter";
const niches: Record<string, string[]> = {
  restaurants: ['["amenity"="restaurant"]'], pizza: ['["amenity"~"^(restaurant|fast_food)$"]["cuisine"~"pizza"]', '["amenity"~"^(restaurant|fast_food)$"]["name"~"pizza",i]'],
  dental: ['["amenity"="dentist"]', '["healthcare"="dentist"]'], repair: ['["shop"="car_repair"]'], beauty: ['["shop"~"^(hairdresser|beauty)$"]'], markets: ['["shop"~"^(supermarket|convenience)$"]'],
};
function keywordNiche(term: string) {
  const value = normalizeSearchText(term);
  return /pizza/.test(value) ? "pizza" : /odontolog|dentista|dental/.test(value) ? "dental" : /oficina mecanica|auto center/.test(value) ? "repair" : /restaurante/.test(value) ? "restaurants" : /salao de beleza/.test(value) ? "beauty" : /supermercado/.test(value) ? "markets" : null;
}
const freeFilters = ['[~"^(shop|craft|office)$"~"."]', '["amenity"~"^(restaurant|cafe|bar|pub|fast_food|dentist|clinic|doctors|pharmacy|hospital|veterinary|fuel|bank)$"]'];
export function overpassQuery(code: string, request: Pick<SearchRequest, "mode" | "term">) {
  if (!/^\d{7}$/.test(code)) throw new OpenDataError("invalid_input");
  const niche = request.mode === "category" ? request.term : request.mode === "keyword" ? keywordNiche(request.term) : null;
  if (request.mode === "category" && !niches[request.term]) throw new OpenDataError("invalid_input");
  if (request.mode === "keyword" && (!request.term.trim() || !/^[\p{L}\p{M} &'’-]{1,80}$/u.test(request.term))) throw new OpenDataError("invalid_input", "Use palavras do nome ou do segmento, sem telefone, e-mail ou URL.");
  const filters = niche ? niches[niche]! : freeFilters;
  const escaped = request.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const name = request.mode === "keyword" && !niche ? `["name"~${JSON.stringify(escaped)},i]` : "[name]";
  return `[out:json][timeout:25][maxsize:67108864];area["ref:IBGE"="${code}"]["boundary"="administrative"]["admin_level"="8"]->.region;.region out count;(${filters.map((f) => `nwr(area.region)${f}${name};`).join("")});out body center 61;`;
}
const elementSchema = z.object({ type: z.enum(["node", "way", "relation", "count"]), id: z.number().int().positive().optional(), lat: z.number().optional(), lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(), tags: z.record(z.string(), z.string().max(10000)).optional() });
const labels: Record<string, string> = { restaurant: "Restaurante", fast_food: "Lanchonete", cafe: "Cafeteria", bar: "Bar", pub: "Bar", dentist: "Clínica odontológica", clinic: "Clínica", doctors: "Consultório médico", pharmacy: "Farmácia", hospital: "Hospital", veterinary: "Clínica veterinária", fuel: "Posto de combustível", bank: "Banco", car_repair: "Oficina mecânica", hairdresser: "Salão de beleza", beauty: "Salão de beleza", supermarket: "Supermercado", convenience: "Mercado de conveniência", bakery: "Padaria", clothes: "Loja de roupas", lawyer: "Advocacia", electrician: "Eletricista" };
export function normalizeOverpass(input: unknown, city: string, observedAt: string): OpenCache {
  const parsed = z.object({ elements: z.array(elementSchema).max(62), remark: z.string().optional() }).safeParse(input);
  if (!parsed.success || parsed.data.remark) throw new OpenDataError("provider_unavailable");
  const area = parsed.data.elements.find((e) => e.type === "count");
  if (!area || Number(area.tags?.areas ?? "0") < 1) throw new OpenDataError("not_found", "A área deste município não foi localizada no OpenStreetMap pelo código IBGE. Tente outra cidade; isso não significa ausência de empresas.");
  const found = parsed.data.elements.filter((e) => e.type !== "count");
  const records: OpenRecord[] = [];
  for (const element of found.slice(0, 60)) {
    const tags = element.tags ?? {}; const point = element.center ?? { lat: element.lat, lon: element.lon };
    if (!element.id || !tags.name || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    let website: string | null = null;
    try { const url = new URL(tags.website ?? tags["contact:website"] ?? ""); if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 2048) website = url.href; } catch {}
    const category = /pizza/i.test(tags.cuisine ?? "") ? "Pizzaria" : labels[tags.amenity ?? tags.shop ?? tags.office ?? tags.craft ?? tags.healthcare ?? ""] ?? (tags.shop ? "Comércio" : tags.office ? "Escritório e serviços" : tags.craft ? "Serviços especializados" : "Estabelecimento");
    const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"]].filter(Boolean).join(", ");
    records.push({ reference: `${element.type}/${element.id}`, name: tags.name.slice(0, 200), category, website, address: address ? address.slice(0, 500) : null,
      city, latitude: point.lat!, longitude: point.lon!, observedAt });
  }
  return openCacheSchema.parse({ records: [...new Map(records.map((r) => [r.reference, r])).values()], limited: found.length > 60, observedAt });
}
export async function searchOverpass(code: string, city: string, request: Pick<SearchRequest, "mode" | "term">, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const query = overpassQuery(code, request);
  const response = await fetcher(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "AG-Prospeccao/1.0 (+https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds)" },
    body: new URLSearchParams({ data: query }), signal, redirect: "error", cache: "no-store" });
  if (!response.ok) { await response.body?.cancel(); throw new OpenDataError(response.status === 429 ? "rate_limited" : "provider_unavailable"); }
  if (!response.body) throw new OpenDataError("provider_unavailable");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { signal.throwIfAborted(); const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 2 * 1024 * 1024) { await reader.cancel(); throw new OpenDataError("limit_reached"); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  // Sem retry automático, rotação de instâncias ou cópia de payload para logs/banco.
  return normalizeOverpass(JSON.parse(Buffer.concat(chunks).toString("utf8")), city, new Date().toISOString());
}
