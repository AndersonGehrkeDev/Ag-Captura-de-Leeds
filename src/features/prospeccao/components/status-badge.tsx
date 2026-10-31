import { Globe, ShieldAlert, ShieldCheck } from "lucide-react";
import type { WebsiteStatus } from "../domain/company";

export const statusLabels = { missing: "Sem site", improve: "Para melhorar", good: "Site ok" } as const;
export function StatusBadge({ status }: { status: WebsiteStatus }) {
  const Icon = status === "missing" ? ShieldAlert : status === "good" ? ShieldCheck : Globe;
  return <span className={`website-badge status-${status}`}><Icon aria-hidden="true" size={11} />{statusLabels[status]}</span>;
}
