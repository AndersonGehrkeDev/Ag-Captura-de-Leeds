import type { Metadata } from "next";
import { demoCompanies } from "@/demo/prospect-companies";
import { ProspectingScreen } from "@/features/prospeccao/components/prospecting-screen";

export const metadata: Metadata = { title: "Prospecção · Demonstração" };
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ busca?: string | string[] }> }) {
  const { busca } = await searchParams;
  const query = typeof busca === "string" && busca.length <= 100 ? busca.trim() : "";
  return <ProspectingScreen companies={demoCompanies} demo initialQuery={query} />;
}
