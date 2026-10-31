import type { ReactNode } from "react";
import { AppNavigation } from "./app-navigation";
import { AppHeader } from "./app-header";
import { SessionEvents } from "@/features/auth/session-events";
import type { PublicSupabaseConfig } from "@/lib/supabase/public-config";
import type { ConsumptionReport } from "@/domain/management";

export function PlatformShell({ children, viewer, config, consumption }: { children: ReactNode; viewer?: { name: string; workspace: string }; config?: PublicSupabaseConfig; consumption?: ConsumptionReport }) {
  return <div className="app-shell"><AppNavigation consumption={consumption} /><div className="min-w-0"><AppHeader viewer={viewer} /><main id="conteudo" tabIndex={-1} className="application-main">{children}</main></div>{config && <SessionEvents config={config} />}</div>;
}
