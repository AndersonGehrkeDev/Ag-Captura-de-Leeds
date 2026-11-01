import "server-only";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
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
  const records = rows.slice(0, 60).map((row) => {
    let website: string | null = null;
    try { const url = new URL(row.website ?? ""); if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 2048) website = url.href; } catch {}
    return { origin: "overture", reference: `overture/${row.id}`, name: row.name, category: categories[row.subtype ?? ""] ?? categories[row.category ?? ""] ?? "Outro estabelecimento",
      website, address: row.address && row.address.length <= 500 ? row.address : null, city, latitude: row.latitude, longitude: row.longitude, observedAt };
  });
  return openCacheSchema.parse({ observedAt, limited: rows.length > 60, records: [...new Map(records.map((record) => [record.reference, record])).values()] });
}
export async function municipalityBounds(code: string, signal: AbortSignal): Promise<[number, number, number, number]> {
  if (!/^\d{7}$/.test(code)) throw new OpenDataError("invalid_input");
  const contents = await readFile(join(process.cwd(), "data/open/municipios-bounds.json"), { signal });
  if (contents.length > 2 * 1024 * 1024) throw new OpenDataError("not_configured");
  const data = z.object({ entries: z.array(z.strictObject({ code: z.string().regex(/^\d{7}$/), bounds: z.tuple([z.number().min(-75).max(-28), z.number().min(-35).max(6), z.number().min(-75).max(-28), z.number().min(-35).max(6)]) })).min(5500).max(6000) }).parse(JSON.parse(contents.toString("utf8")));
  const entry = data.entries.find((item) => item.code === code);
  if (!entry) throw new OpenDataError("not_found", "A malha deste município ainda não consta no recorte oficial disponível. Isso não significa ausência de empresas.");
  if (entry.bounds[0] >= entry.bounds[2] || entry.bounds[1] >= entry.bounds[3]) throw new OpenDataError("not_configured");
  return entry.bounds;
}
export async function searchOverture(code: string, city: string, request: Pick<SearchRequest, "mode" | "term">, signal: AbortSignal): Promise<OpenCache> {
  let phase = "geography";
  let instance: DuckDBInstance | undefined; let connection: DuckDBConnection | undefined;
  const stop = () => connection?.interrupt();
  try {
    const bounds = await municipalityBounds(code, signal); const term = overtureTerm(request);
    phase = "temporary_directory";
    const directory = join(tmpdir(), "ag-overture-extensions"); await mkdir(directory, { recursive: true }); signal.throwIfAborted();
    phase = "engine_create";
    instance = await DuckDBInstance.create(":memory:", { home_directory: directory, extension_directory: directory, memory_limit: "256MB", threads: "2" });
    phase = "engine_connect";
    connection = await instance.connect(); signal.addEventListener("abort", stop, { once: true });
    phase = "engine_setup";
    signal.throwIfAborted();
    await connection.run("INSTALL httpfs;LOAD httpfs;SET s3_region='us-west-2';SET s3_access_key_id='';SET s3_secret_access_key='';SET s3_session_token='';SET http_timeout=5;SET http_retries=0;");
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
    phase = "data_query";
    const result = await connection.runAndReadAll(sql, [...bounds, city.split(" — ")[0]!, term.category, term.name]);
    signal.throwIfAborted();
    phase = "data_projection";
    return normalizeOverture(result.getRowObjectsJson(), city, new Date().toISOString());
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof OpenDataError) throw error;
    const message = error instanceof Error ? error.message : "";
    const diagnostic = error instanceof Error && error.name === "ZodError" ? "projection" : /extension|install/i.test(message) ? "duckdb_extension" : /memory/i.test(message) ? "duckdb_memory" : /SSL|certificate/i.test(message) ? "duckdb_tls" : /403/.test(message) ? "duckdb_http403" : /404/.test(message) ? "duckdb_http404" : /HTTP|IO Error|connect/i.test(message) ? "duckdb_network" : /Binder|Catalog|Parser/i.test(message) ? "duckdb_schema" : "duckdb_runtime";
    throw new OpenDataError("provider_unavailable", undefined, `${phase}_${diagnostic}`);
  }
  finally { signal.removeEventListener("abort", stop); connection?.closeSync(); instance?.closeSync(); }
}
