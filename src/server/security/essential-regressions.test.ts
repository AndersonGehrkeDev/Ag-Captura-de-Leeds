import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const dns = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: dns }));
import { validateAuditTarget } from "@/server/providers/google-pagespeed/target";
import { createCrmService } from "@/server/crm/service";
import { integrationFixture, testUser, testWorkspace } from "../../../tests/fixtures/integration-catalog";

it("nega o mesmo prefixo IPv6 reservado com e sem compressão, preservando um endereço público", async () => {
  // DNS inteiramente simulado; nenhum destino ou provedor é acessado.
  dns.mockResolvedValueOnce([{ address: "2001::1", family: 6 }])
    .mockResolvedValueOnce([{ address: "2001:0:0:0:0:0:0:1", family: 6 }])
    .mockResolvedValueOnce([{ address: "2606:4700:4700::1111", family: 6 }]);
  expect(await validateAuditTarget("https://auditoria.example.org/")).toBeNull();
  expect(await validateAuditTarget("https://auditoria.example.org/")).toBeNull();
  expect((await validateAuditTarget("https://auditoria.example.org/"))?.href).toBe("https://auditoria.example.org/");
});

it("não exporta campo cuja permissão venceu durante a operação, mesmo sem mudança no manifesto", async () => {
  const f = integrationFixture();
  const expiresAt = "2026-10-27T12:00:01.000Z";
  const nameLicense = { ...f.license, id: "f2000000-0000-4000-8000-000000000001", validUntil: expiresAt, fields: ["name" as const] };
  const provenance = new Map(f.snapshot.provenance); provenance.set(f.ids.name, { ...provenance.get(f.ids.name)!, licenseId: nameLicense.id });
  const snapshot = { ...f.snapshot, provenance, licenses: new Map([...f.snapshot.licenses, [nameLicense.id, nameLicense]]) };
  let clock = new Date("2026-10-27T12:00:00.000Z"); let authorizationReads = 0;
  const leadId = "f1000000-0000-4000-8000-000000000001";
  const execute = createCrmService({
    executor: () => "a".repeat(64), flags: () => f.context.flags, now: () => clock,
    authorize: async () => { if (++authorizationReads === 2) clock = new Date("2026-10-27T12:00:02.000Z"); return testUser; },
    registry: async () => ({ snapshot, sources: [], revision: "SYNTHETIC_UNCHANGED_REVISION" }),
    repository: { async execute() { return { leads: [{
      id: leadId, internalLabel: "Lead interno [TESTE]", mode: "catalog", stage: "new", assignedTo: null, tags: [], doNotContact: false, nextContactAt: null,
      createdAt: "2026-10-26T00:00:00.000Z", updatedAt: "2026-10-26T00:00:00.000Z",
      // A referência continua válida: é a licença do campo nome que vence.
      binding: { sourceId: f.sourceId, reference: f.company.reference.value, provenanceId: f.company.reference.provenanceId, expiresAt: "2026-11-02T00:00:00.000Z", lineageIds: [f.company.reference.provenanceId] },
    }], members: [], notes: [], history: [] }; } },
  });
  const result = await execute({ operation: "export", workspaceId: testWorkspace, leadIds: [leadId], columns: ["id", "name"] }, new AbortController().signal);
  expect(result).toMatchObject({ ok: true, data: { exportedCount: 1, omittedCells: 1 } });
  if (!result.ok) throw new Error("fixture");
  expect(result.data.csv).toContain(leadId);
  expect(result.data.csv).not.toContain("Empresa Própria [TESTE]");
  expect(authorizationReads).toBe(2);
});
