import "server-only";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";
import type { SearchRequest } from "@/domain/integrations/contracts";
import { OpenDataError } from "./overpass";
import { openCacheSchema, overtureRelease, type OpenCache } from "./model";

const rawSchema = z.object({ id: z.uuid(), name: z.string().min(1).max(200), category: z.string().nullable(), subtype: z.string().nullable(), website: z.string().nullable(), address: z.string().nullable(), latitude: z.number(), longitude: z.number() });
const categories: Record<string, string> = { restaurant: "Restaurante", pizza_restaurant: "Pizzaria", pizzeria: "Pizzaria", dental_clinic: "Clínica odontológica", dentist: "Clínica odontológica", automotive_service: "Oficina mecânica", auto_repair: "Oficina mecânica", automotive_repair: "Oficina mecânica", beauty_salon: "Salão de beleza", personal_or_beauty_service: "Serviços de beleza", supermarket: "Supermercado", grocery_store: "Supermercado e mercearia", bar: "Bar", cafe: "Cafeteria", medical_service: "Serviços médicos", pharmacy_and_drug_store: "Farmácia", real_estate_service: "Imobiliária", hotel: "Hotel", legal_service: "Serviços jurídicos", corporate_or_business_office: "Escritório empresarial", vehicle_parts_store: "Autopeças", casual_eatery: "Lanchonete", gym: "Academia", laundry_service: "Lavanderia", professional_service: "Serviços profissionais" };
const filters: Record<string, string> = { restaurants: "restaurant", pizza: "pizza|pizzeria", dental: "dental|dentist", repair: "automotive_service|automotive_repair|auto_repair", beauty: "beauty|hairdresser", markets: "supermarket|grocery" };
export function overtureTerm(request: Pick<SearchRequest, "mode" | "term">) {
  const term = request.term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const niche = request.mode === "category" ? request.term : request.mode === "keyword" ? /pizza/.test(term) ? "pizza" : /odontolog|dentista|dental/.test(term) ? "dental" : /oficina mecanica|auto center/.test(term) ? "repair" : /restaurante/.test(term) ? "restaurants" : /salao de beleza/.test(term) ? "beauty" : /supermercado/.test(term) ? "markets" : null : null;
  if (request.mode === "category" && !filters[request.term]) throw new OpenDataError("invalid_input");
  return { category: niche ? filters[niche]! : "", name: request.mode === "keyword" && !niche ? term : "" };
}
export function normalizeOverture(input: unknown[], city: string, observedAt: string): OpenCache {
  const rows = z.array(rawSchema).max(61).parse(input);
  return openCacheSchema.parse({ observedAt, limited: rows.length > 60, records: rows.slice(0, 60).map((row) => {
    let website: string | null = null;
    try { const url = new URL(row.website ?? ""); if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 2048) website = url.href; } catch {}
    return { origin: "overture", reference: `overture/${row.id}`, name: row.name, category: categories[row.subtype ?? ""] ?? categories[row.category ?? ""] ?? "Outro estabelecimento",
      website, address: row.address && row.address.length <= 500 ? row.address : null, city, latitude: row.latitude, longitude: row.longitude, observedAt };
  }) });
}
export async function municipalityBounds(code: string, signal: AbortSignal): Promise<[number, number, number, number]> {
  if (!/^\d{7}$/.test(code)) throw new OpenDataError("invalid_input");
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${code}?formato=application/vnd.geo%2Bjson&qualidade=minima`;
  const response = await fetch(url, { signal, redirect: "error", cache: "no-store" });
  if (!response.ok || !response.body) throw new OpenDataError("provider_unavailable");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 1024 * 1024) { await reader.cancel(); throw new OpenDataError("limit_reached"); } chunks.push(value); } } finally { reader.releaseLock(); }
  const geo = z.object({ features: z.array(z.object({ geometry: z.object({ type: z.enum(["Polygon", "MultiPolygon"]), coordinates: z.unknown() }) })).min(1).max(100) }).parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  const bounds: [number, number, number, number] = [180, 90, -180, -90]; let count = 0;
  function walk(value: unknown, depth = 0) {
    if (depth > 5 || !Array.isArray(value)) throw new OpenDataError("provider_unavailable");
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      const [x, y] = value as [number, number]; if (!Number.isFinite(x) || !Number.isFinite(y) || x < -75 || x > -28 || y < -35 || y > 6 || ++count > 50000) throw new OpenDataError("provider_unavailable");
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y); bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y); return;
    }
    for (const child of value) walk(child, depth + 1);
  }
  geo.features.forEach((feature) => walk(feature.geometry.coordinates));
  if (count < 3 || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) throw new OpenDataError("provider_unavailable");
  return bounds;
}
export async function searchOverture(code: string, city: string, request: Pick<SearchRequest, "mode" | "term">, signal: AbortSignal): Promise<OpenCache> {
  const bounds = await municipalityBounds(code, signal); const term = overtureTerm(request);
  const directory = join(tmpdir(), "ag-overture-extensions"); await mkdir(directory, { recursive: true }); signal.throwIfAborted();
  const instance = await DuckDBInstance.create(":memory:", { extension_directory: directory, memory_limit: "256MB", threads: "2" });
  const connection = await instance.connect(); const stop = () => connection.interrupt(); signal.addEventListener("abort", stop, { once: true });
  try {
    signal.throwIfAborted();
    await connection.run("INSTALL httpfs;LOAD httpfs;SET s3_region='us-west-2';SET s3_access_key_id='';SET s3_secret_access_key='';SET http_timeout=5;SET http_retries=0;");
    signal.throwIfAborted();
    // Fonte e release fixas, SQL parametrizado e somente campos necessários. Sem credenciais AWS.
    const sql = `SELECT id,names.primary AS name,basic_category AS category,taxonomy.primary AS subtype,websites[1] AS website,addresses[1].freeform AS address,bbox.xmin AS longitude,bbox.ymin AS latitude
      FROM read_parquet('s3://overturemaps-us-west-2/release/${overtureRelease}/theme=places/type=place/*')
      WHERE bbox.xmin BETWEEN $1 AND $3 AND bbox.ymin BETWEEN $2 AND $4
      AND lower(strip_accents(addresses[1].locality))=lower(strip_accents($5))
      AND confidence>=0.8 AND operating_status IS DISTINCT FROM 'closed' AND length(names.primary) BETWEEN 1 AND 200
      AND list_has_all(['CDLA-Permissive-2.0'],list_transform(sources,lambda s:s.license))
      AND list_has_all(['meta','Microsoft','Overture'],list_transform(sources,lambda s:s.dataset))
      AND ($6='' OR regexp_matches(concat(basic_category,' ',taxonomy.primary,' ',array_to_string(taxonomy.hierarchy,' ')),$6))
      AND ($7='' OR contains(lower(strip_accents(names.primary)),$7)) LIMIT 61`;
    const result = await connection.runAndReadAll(sql, [...bounds, city.split(" — ")[0]!, term.category, term.name]);
    signal.throwIfAborted();
    return normalizeOverture(result.getRowObjectsJson(), city, new Date().toISOString());
  } catch (error) { if (signal.aborted) throw error; throw new OpenDataError("provider_unavailable"); }
  finally { signal.removeEventListener("abort", stop); connection.closeSync(); instance.closeSync(); }
}
