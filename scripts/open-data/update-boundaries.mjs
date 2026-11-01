import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { DuckDBInstance } from "@duckdb/node-api";

const source = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio";
const response = await fetch(source, { headers: { Accept: "application/vnd.geo+json" }, signal: AbortSignal.timeout(45000), redirect: "error" });
if (!response.ok || !response.body) throw new Error("Malhas IBGE indisponíveis; arquivo anterior preservado.");
const reader = response.body.getReader(); const chunks = []; let bytes = 0;
try { for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 32 * 1024 * 1024) { await reader.cancel(); throw new Error("Resposta IBGE acima do limite."); } chunks.push(value); } } finally { reader.releaseLock(); }
const geo = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (geo.type !== "FeatureCollection" || !Array.isArray(geo.features) || geo.features.length < 5500 || geo.features.length > 6000) throw new Error("Malha nacional inválida; arquivo anterior preservado.");
const municipalities = JSON.parse(await readFile("data/open/municipios.json", "utf8")).municipalities;
const allowed = new Set(municipalities.map((city) => city.code)); const entries = [];
for (const feature of geo.features) {
  const code = String(feature.properties?.codarea);
  if (!/^\d{7}$/.test(code) || !allowed.has(code) || !["Polygon", "MultiPolygon"].includes(feature.geometry?.type)) throw new Error("Município/geometria fora do contrato.");
  const bounds = [180, 90, -180, -90]; let points = 0;
  function walk(value, depth = 0) {
    if (!Array.isArray(value) || depth > 5) throw new Error("Geometria inválida.");
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      const [x, y] = value;
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < -75 || x > -28 || y < -35 || y > 6 || ++points > 100000) throw new Error("Coordenadas inválidas.");
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y); bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y); return;
    }
    value.forEach((child) => walk(child, depth + 1));
  }
  walk(feature.geometry.coordinates);
  if (points < 3 || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) throw new Error("Extensão inválida.");
  entries.push({ code, bounds });
}
if (new Set(entries.map((entry) => entry.code)).size !== entries.length) throw new Error("Municípios duplicados.");
const present = new Set(entries.map((entry) => entry.code));
const supplements = [];
if (allowed.has("5101837") && !present.has("5101837")) {
  // A API simplificada ainda não inclui Boa Esperança do Norte. Complemento oficial 2025,
  // incluindo os limites atualizados dos municípios de MT; não inferir caixa de um vizinho.
  const supplement = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/UFs/MT/MT_Municipios_2025.zip";
  const zipResponse = await fetch(supplement, { signal: AbortSignal.timeout(45000), redirect: "error" });
  if (!zipResponse.ok) throw new Error("Complemento IBGE indisponível; arquivo anterior preservado.");
  const zip = Buffer.from(await zipResponse.arrayBuffer()); if (zip.length > 32 * 1024 * 1024) throw new Error("Complemento acima do limite.");
  await mkdir(".local-data/duckdb/extensions", { recursive: true });
  const zipPath = resolve(".local-data/MT_Municipios_2025.zip"); await writeFile(zipPath, zip);
  const instance = await DuckDBInstance.create(":memory:", { extension_directory: ".local-data/duckdb/extensions", memory_limit: "256MB", threads: "2" });
  const connection = await instance.connect();
  try {
    // Extensão espacial oficial assinada, apenas na atualização local; nunca no runtime Vercel.
    await connection.run("INSTALL spatial;LOAD spatial;");
    const rows = await connection.runAndReadAll("SELECT CD_MUN::VARCHAR AS code,ST_XMin(geom) AS xmin,ST_YMin(geom) AS ymin,ST_XMax(geom) AS xmax,ST_YMax(geom) AS ymax FROM ST_Read(?)", [`/vsizip/${zipPath.replaceAll("\\", "/")}/MT_Municipios_2025.shp`]);
    const extra = rows.getRowObjectsJson();
    if (extra.length < 140 || extra.length > 150 || !extra.some((row) => row.code === "5101837")) throw new Error("Complemento municipal inválido.");
    const byCode = new Map(entries.map((entry) => [entry.code, entry]));
    for (const row of extra) {
      const bounds = [row.xmin, row.ymin, row.xmax, row.ymax];
      if (typeof row.code !== "string" || !row.code.startsWith("51") || !allowed.has(row.code) || bounds.some((value) => typeof value !== "number" || !Number.isFinite(value)) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) throw new Error("Extensão complementar inválida.");
      byCode.set(row.code, { code: row.code, bounds });
    }
    entries.splice(0, entries.length, ...byCode.values());
    supplements.push({ source: supplement, scope: "UF 51", edition: "2025", sha256: createHash("sha256").update(zip).digest("hex") });
  } finally { connection.closeSync(); instance.closeSync(); }
}
const complete = new Set(entries.map((entry) => entry.code));
const missing = municipalities.filter((city) => !complete.has(city.code));
if (missing.length) throw new Error("Municípios sem caixa oficial; arquivo anterior preservado.");
entries.sort((a, b) => a.code.localeCompare(b.code));
await writeFile("data/open/municipios-bounds.json", JSON.stringify({ source, downloadedAt: new Date().toISOString(), supplements, entries, missing }) + "\n");
console.log(JSON.stringify({ municipalities: municipalities.length, bounds: entries.length, missing: missing.length }));
