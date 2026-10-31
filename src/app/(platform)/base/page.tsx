import type { Metadata } from "next";
import Link from "next/link";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { getOverview, getConsumption } from "@/server/management/queries";
import { OverviewCards, Funnel } from "@/components/workspace/overview";
import { ConsumptionSummary } from "@/components/workspace/consumption";
import { TasksPanel } from "@/features/dashboard/components/tasks-panel";
export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const { client, workspace, user } = await requireSelectedWorkspace();
  const [overview, consumption, tasks] = await Promise.all([getOverview(client, workspace.id), getConsumption(client, workspace.id), client.from("crm_tasks").select("id,title,due_at,completed_at,created_by,assigned_to").eq("workspace_id", workspace.id).is("completed_at", null).order("due_at", { ascending: true, nullsFirst: false }).order("created_at").limit(20)]);
  return <div className="management-page"><header><h1>Dashboard</h1><p>{workspace.name} · Indicadores consultados no banco, sem dados demonstrativos.</p></header><OverviewCards data={overview} /><div className="management-grid"><Funnel data={overview} /><section className="ag-panel management-section"><h2>Consumo registrado</h2><ConsumptionSummary report={consumption} /><Link className="management-link" href="/relatorios">Ver relatórios e limites</Link></section></div><TasksPanel workspaceId={workspace.id} userId={user.id} manage={workspace.role !== "member"} tasks={tasks.data ?? []} available={!tasks.error} /></div>;
}
