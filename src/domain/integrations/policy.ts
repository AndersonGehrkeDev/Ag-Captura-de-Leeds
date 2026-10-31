import { licenseSchema, provenanceSchema, type DataAction, type Provider, type ProvenanceRecord, type Purpose, type SourceLicense } from "./data";
import type { IntegrationFlags } from "./flags";

export const integrationPolicyVersion = "2026-10-28.1";
type ProviderPolicy = { readonly actions: readonly DataAction[]; readonly productUse: "conditional" | "blocked" | "demo_only"; readonly reason: string };
export const providerDataPolicies: Readonly<Record<Provider, ProviderPolicy>> = Object.freeze({
  first_party: { actions: ["display", "persist", "export", "ai"], productUse: "conditional", reason: "ownership_evidence_required" },
  licensed: { actions: ["display", "persist", "export", "ai"], productUse: "conditional", reason: "scoped_license_required" },
  google_places: { actions: [], productUse: "blocked", reason: "google_prospecting_use_not_established" },
  google_maps: { actions: [], productUse: "blocked", reason: "google_prospecting_use_not_established" },
  // A documentação demonstra consulta/exibição; não estabeleceu licença de arquivo/CSV/IA para este produto.
  pagespeed: { actions: ["display"], productUse: "conditional", reason: "audit_display_review_required" },
  openai: { actions: ["display", "persist", "export"], productUse: "conditional", reason: "draft_and_input_rights_required" },
  demo: { actions: ["display"], productUse: "demo_only", reason: "synthetic_display_only" },
  supabase: { actions: [], productUse: "blocked", reason: "transport_does_not_change_origin" },
  github: { actions: [], productUse: "blocked", reason: "transport_does_not_change_origin" },
  vercel: { actions: [], productUse: "blocked", reason: "transport_does_not_change_origin" },
  unknown: { actions: [], productUse: "blocked", reason: "permission_not_established" },
});

export interface PolicyContext {
  readonly workspaceId: string;
  readonly mode: "production" | "demo";
  readonly now: Date;
  readonly flags: IntegrationFlags;
  // Repositório/manifesto confiável; nunca preencher com JSON vindo de uma requisição.
  readonly provenance: ReadonlyMap<string, ProvenanceRecord>;
  readonly licenses: ReadonlyMap<string, SourceLicense>;
}
export type PolicyDecision = { readonly allowed: false; readonly reason: string } | {
  readonly allowed: true; readonly policyVersion: string; readonly deleteAt: string | null; readonly attributions: readonly string[];
};
const deny = (reason: string): PolicyDecision => ({ allowed: false, reason });

export function authorizeData(provenanceId: string, action: DataAction, purpose: Purpose, context: PolicyContext): PolicyDecision {
  if (!Number.isFinite(context.now.getTime())) return deny("invalid_clock");
  if (action === "persist" && !context.flags.ownPersistence) return deny("feature_disabled");
  if (action === "export" && !context.flags.exports) return deny("feature_disabled");
  if (action === "ai" && !context.flags.aiMessages) return deny("feature_disabled");
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const attributions = new Set<string>();
  let deleteAt = Infinity;
  function visit(id: string, depth: number): string | null {
    if (depth > 16 || visited.size + visiting.size > 128 || visiting.has(id)) return "invalid_lineage";
    if (visited.has(id)) return null;
    const parsed = provenanceSchema.safeParse(context.provenance.get(id));
    if (!parsed.success || parsed.data.id !== id) return "missing_provenance";
    const record = parsed.data;
    if (record.workspaceId !== context.workspaceId) return "workspace_mismatch";
    if (new Date(record.observedAt).getTime() > context.now.getTime()) return "invalid_observation_date";
    const policy = providerDataPolicies[record.provider];
    if (policy.productUse === "blocked") return policy.reason;
    if (!policy.actions.includes(action)) return "provider_action_not_permitted";
    if (record.provider === "pagespeed" && (!["audit_metric", "audit_recommendation"].includes(record.field) || purpose !== "website_audit")) return "provider_scope_not_permitted";
    if (record.provider === "openai" && (record.field !== "message_draft" || !["message_draft", "crm"].includes(purpose))) return "provider_scope_not_permitted";
    if (policy.productUse === "demo_only") {
      if (context.mode !== "demo") return "demo_in_production";
    } else {
      if (context.mode !== "production") return "production_in_demo";
      const parsedLicense = licenseSchema.safeParse(record.licenseId ? context.licenses.get(record.licenseId) : null);
      if (!parsedLicense.success) return "missing_permission_evidence";
      const license = parsedLicense.data;
      if (license.id !== record.licenseId || license.workspaceId !== context.workspaceId || license.provider !== record.provider || license.sourceReference !== record.reference) return "license_scope_mismatch";
      if (license.revokedAt || new Date(license.approvedAt) > context.now || new Date(license.validUntil) <= context.now) return "license_not_current";
      if (!license.purposes.includes(purpose) || !license.fields.includes(record.field) || !license.actions.includes(action)) return "license_action_not_permitted";
      if (license.attribution) attributions.add(license.attribution);
      if (action === "persist") {
        if (!license.retentionDays) return "retention_not_established";
        // Contado da observação, não da cópia/exportação; reprocessar não reinicia o prazo.
        const until = Math.min(new Date(record.observedAt).getTime() + license.retentionDays * 86400000, new Date(license.validUntil).getTime());
        if (until <= context.now.getTime()) return "retention_expired";
        deleteAt = Math.min(deleteAt, until);
      }
    }
    if ((record.method === "manual_copy" || record.method === "derived" || record.provider === "openai") && !record.parentIds.length) return "missing_parent_provenance";
    visiting.add(id);
    for (const parent of record.parentIds) { const failure = visit(parent, depth + 1); if (failure) return failure; }
    visiting.delete(id); visited.add(id);
    return null;
  }
  const failure = visit(provenanceId, 0);
  return failure ? deny(failure) : { allowed: true, policyVersion: integrationPolicyVersion, deleteAt: Number.isFinite(deleteAt) ? new Date(deleteAt).toISOString() : null, attributions: [...attributions] };
}
