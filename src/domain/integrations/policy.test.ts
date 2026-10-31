import { describe, expect, it } from "vitest";
import { integrationFixture, otherWorkspace } from "../../../tests/fixtures/integration-catalog";
import { authorizeData } from "./policy";
import { derivedRecord, manualCopy, type Provider } from "./data";
import { readIntegrationFlags } from "./flags";

describe("política central e proveniência", () => {
  it.each(["display", "persist", "export", "ai"] as const)("autoriza %s próprio somente com evidência de escopo válido", (action) => {
    const f = integrationFixture();
    expect(authorizeData(f.ids.name, action, "crm", f.context).allowed).toBe(true);
    expect(authorizeData(f.ids.name, action, "crm", { ...f.context, licenses: new Map() }).allowed).toBe(false);
  });
  it.each(["google_places", "google_maps"] as const)("%s bloqueado inclusive ID, com flags ligadas", (provider) => {
    const f = integrationFixture(); const id = f.ids.external_id;
    f.provenance.set(id, { ...f.provenance.get(id)!, provider });
    for (const action of ["display", "persist", "export", "ai"] as const) expect(authorizeData(id, action, "prospecting", f.context)).toMatchObject({ allowed: false, reason: "google_prospecting_use_not_established" });
  });
  it("cópia manual conserva a origem e não libera Google", () => {
    const f = integrationFixture(); const original = { ...f.provenance.get(f.ids.name)!, provider: "google_places" as const };
    f.provenance.set(original.id, original);
    const copy = manualCopy(original, "c3000000-0000-4000-8000-000000000001"); f.provenance.set(copy.id, copy);
    expect(copy.provider).toBe("google_places");
    expect(authorizeData(copy.id, "persist", "crm", f.context).allowed).toBe(false);
  });
  it("derivação com rótulo próprio e licença nova continua bloqueada pela origem Google", () => {
    const f = integrationFixture(); const parent = f.provenance.get(f.ids.name)!;
    f.provenance.set(parent.id, { ...parent, provider: "google_places" });
    const child = derivedRecord({ id: "c3000000-0000-4000-8000-000000000002", workspaceId: f.context.workspaceId, provider: "first_party", reference: f.license.sourceReference, field: "note", parentIds: [parent.id], licenseId: f.license.id, observedAt: parent.observedAt });
    f.provenance.set(child.id, child);
    expect(authorizeData(child.id, "ai", "message_draft", f.context)).toMatchObject({ allowed: false });
  });
  it.each(["supabase", "github", "vercel", "unknown"] satisfies Provider[])("%s não concede direitos sobre conteúdo transportado", (provider) => {
    const f = integrationFixture(); f.provenance.set(f.ids.name, { ...f.provenance.get(f.ids.name)!, provider });
    expect(authorizeData(f.ids.name, "export", "crm", f.context).allowed).toBe(false);
  });
  it.each(["revoked", "expired", "other-workspace", "wrong-field", "wrong-purpose", "wrong-action", "wrong-reference"])("recusa licença %s", (kind) => {
    const f = integrationFixture();
    const license = { ...f.license, ...(kind === "revoked" ? { revokedAt: "2026-10-26T12:00:00Z" } : kind === "expired" ? { validUntil: "2026-10-26T12:00:00Z" } : kind === "other-workspace" ? { workspaceId: otherWorkspace } : kind === "wrong-field" ? { fields: ["note" as const] } : kind === "wrong-purpose" ? { purposes: ["website_audit" as const] } : kind === "wrong-action" ? { actions: ["display" as const] } : { sourceReference: "another-source" }) };
    expect(authorizeData(f.ids.name, "persist", "crm", { ...f.context, licenses: new Map([[license.id, license]]) }).allowed).toBe(false);
  });
  it("TTL exige licença e retenção explícitas e usa a observação original", () => {
    const f = integrationFixture();
    expect(authorizeData(f.ids.name, "persist", "crm", f.context)).toMatchObject({ allowed: true, deleteAt: "2026-11-02T00:00:00.000Z" });
    expect(authorizeData(f.ids.name, "persist", "crm", { ...f.context, licenses: new Map([[f.license.id, { ...f.license, retentionDays: null }]]) })).toMatchObject({ allowed: false, reason: "retention_not_established" });
    expect(authorizeData(f.ids.name, "persist", "crm", { ...f.context, now: new Date("2026-11-03T00:00:00Z") })).toMatchObject({ allowed: false, reason: "retention_expired" });
  });
  it("copiar hoje não prolonga o prazo de um campo observado antes", () => {
    const f = integrationFixture(); const original = f.provenance.get(f.ids.name)!;
    const copy = { ...manualCopy(original, "c3000000-0000-4000-8000-000000000003"), observedAt: "2026-10-27T00:00:00Z" };
    f.provenance.set(copy.id, copy);
    expect(authorizeData(copy.id, "persist", "crm", f.context)).toMatchObject({ allowed: true, deleteAt: "2026-11-02T00:00:00.000Z" });
  });
  it("Pagespeed e OpenAI não se tornam fontes de fatos empresariais por uma licença genérica", () => {
    const f = integrationFixture(); const record = f.provenance.get(f.ids.name)!;
    for (const provider of ["pagespeed", "openai"] as const) {
      f.provenance.set(record.id, { ...record, provider });
      const license = { ...f.license, provider };
      expect(authorizeData(record.id, "display", "prospecting", { ...f.context, licenses: new Map([[license.id, license]]) })).toMatchObject({ allowed: false, reason: "provider_scope_not_permitted" });
    }
  });
  it("recusa ancestrais ausentes, ciclos e registros de outro workspace", () => {
    const f = integrationFixture(); const record = f.provenance.get(f.ids.name)!;
    f.provenance.set(record.id, { ...record, parentIds: [record.id] });
    expect(authorizeData(record.id, "display", "crm", f.context).allowed).toBe(false);
    f.provenance.set(record.id, { ...record, parentIds: ["c3000000-0000-4000-8000-000000000099"] });
    expect(authorizeData(record.id, "display", "crm", f.context).allowed).toBe(false);
    f.provenance.set(record.id, { ...record, workspaceId: otherWorkspace });
    expect(authorizeData(record.id, "display", "crm", f.context).allowed).toBe(false);
  });
  it("Pagespeed não herda permissões de cache/export/IA de outros produtos Google", () => {
    const f = integrationFixture(); const id = f.ids.name;
    f.provenance.set(id, { ...f.provenance.get(id)!, provider: "pagespeed", field: "audit_metric" });
    for (const action of ["persist", "export", "ai"] as const) expect(authorizeData(id, action, "website_audit", f.context).allowed).toBe(false);
  });
  it.each([undefined, "", "TRUE", "1", "false"])("flags fechadas para %j e chaves não ativam capacidades", (value) => {
    const flags = readIntegrationFlags({ FEATURE_AI_MESSAGES: value, GOOGLE_PLACES_API_KEY: "synthetic-config-only" });
    expect(Object.values(flags).every((flag) => flag === false)).toBe(true);
  });
});
