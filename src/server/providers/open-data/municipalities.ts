import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { openDataId } from "./model";

const municipalitySchema = z.strictObject({ code: z.string().regex(/^\d{7}$/), name: z.string().min(2).max(100), uf: z.string().regex(/^[A-Z]{2}$/) });
export async function municipalities(signal: AbortSignal) {
  const contents = await readFile(join(process.cwd(), "data/open/municipios.json"), { signal });
  if (contents.length > 1024 * 1024) throw new Error("invalid_municipalities");
  const bundle = z.strictObject({ source: z.url(), downloadedAt: z.iso.datetime(), municipalities: z.array(municipalitySchema).min(5500).max(6000) }).parse(JSON.parse(contents.toString("utf8")));
  return bundle.municipalities.map((city) => ({ ...city, id: openDataId(`ibge:${city.code}`), label: `${city.name} — ${city.uf}` }));
}
