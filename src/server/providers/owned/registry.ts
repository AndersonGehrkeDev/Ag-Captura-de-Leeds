import "server-only";
import { open, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join, relative } from "node:path";
import { catalogManifestSchema } from "@/domain/integrations/catalog-manifest";
import type { WorkspaceIntegrationSnapshot } from "@/server/integrations/contracts";

const maxBytes = 8 * 1024 * 1024;
export class CatalogConfigurationError extends Error { constructor() { super("catalog_not_configured"); } }
export async function readOwnedRegistry(workspaceId: string, signal: AbortSignal, path = process.env.OWNED_CATALOG_FILE) {
  try { return await readRegistry(workspaceId, signal, path); }
  catch (error) {
    if (signal.aborted) throw error;
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    // Apenas falhas de IO transitórias podem ser repetidas pelo transporte. Configuração é permanente.
    if (code === "EAGAIN" || code === "EBUSY" || code === "ETIMEDOUT") throw new Error("temporary_catalog_io");
    throw new CatalogConfigurationError();
  }
}
async function readRegistry(workspaceId: string, signal: AbortSignal, path: string | undefined) {
  if (!path || path.startsWith("\\\\") || path.startsWith("//")) return null;
  signal.throwIfAborted();
  const resolved = await realpath(path);
  const inside = (root: string) => { const part = relative(root, resolved); return !part.startsWith("..") && !isAbsolute(part); };
  if (resolved.startsWith("\\\\") || [join(process.cwd(), "public"), join(process.cwd(), ".next", "static")].some(inside)) throw new Error("invalid_catalog");
  const handle = await open(resolved, "r");
  try {
    // Leitura limitada mesmo se o arquivo mudar depois de stat; nunca ler um payload ilimitado.
    if (!(await handle.stat()).isFile()) throw new Error("invalid_catalog");
    const buffer = Buffer.alloc(maxBytes + 1);
    let length = 0;
    while (length < buffer.length) {
      signal.throwIfAborted();
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    signal.throwIfAborted();
    if (length > maxBytes) throw new Error("invalid_catalog");
    const contents = buffer.subarray(0, length);
    const manifest = catalogManifestSchema.parse(JSON.parse(contents.toString("utf8")));
    const workspace = manifest.workspaces.find((entry) => entry.workspaceId === workspaceId);
    if (!workspace) return null;
    const snapshot: WorkspaceIntegrationSnapshot = {
      workspaceId, sources: workspace.sources.map((source) => ({ ...source, workspaceId })),
      provenance: new Map(workspace.provenance.map((record) => [record.id, record])),
      licenses: new Map(workspace.licenses.map((license) => [license.id, license])), values: new Map((workspace.messageTemplates ?? []).map((entry) => [entry.body.provenanceId, entry.body])),
      messageTemplates: workspace.messageTemplates ?? [],
      catalogs: new Map(workspace.sources.map((source) => [source.id, source.companies])),
      locations: new Map(workspace.sources.map((source) => [source.id, source.locations])),
    };
    return { snapshot, sources: workspace.sources, revision: createHash("sha256").update(contents).digest("hex") };
  } finally { await handle.close(); }
}
