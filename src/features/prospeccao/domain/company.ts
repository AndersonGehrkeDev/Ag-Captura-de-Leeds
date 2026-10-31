export type WebsiteStatus = "missing" | "improve" | "good";
export type SearchMode = "free" | "category" | "keyword";
// View model da demonstração existente. Integrações reais usam domain/integrations/contracts.
// Nunca preencha rating/score/status desta fixture a partir de campos ausentes de um provedor.
export interface ProspectCompany {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly rating: number;
  readonly reviews: number;
  readonly website: string | null;
  readonly status: WebsiteStatus;
  readonly address: string;
  readonly score: number;
  readonly initialLead: boolean;
  readonly photo?: string;
  readonly position: { readonly x: number; readonly y: number };
}
export interface ProspectFilters {
  readonly location: string;
  readonly mode: SearchMode;
  readonly term: string;
  readonly category: string;
  readonly radius: "city" | "10" | "25" | "50";
  readonly opportunity: "all" | WebsiteStatus;
}
export const defaultFilters: ProspectFilters = {
  location: "São Paulo, SP", mode: "free", term: "", category: "all", radius: "city", opportunity: "all",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

// Filtro somente de fixtures locais; não representa busca geográfica ou auditoria real.
export function filterCompanies(companies: readonly ProspectCompany[], filters: ProspectFilters, query: string, onlyOpportunities: boolean) {
  const location = normalize(filters.location);
  if (!location || !(location.includes("sao paulo") || location === "sp")) return [];
  const needle = normalize([query, filters.mode === "keyword" ? filters.term : ""].filter(Boolean).join(" "));
  return companies.filter((company) => {
    const text = normalize(`${company.name} ${company.category} ${company.address}`);
    return (!needle || needle.split(/\s+/).every((word) => text.includes(word)))
      && (filters.mode !== "category" || filters.category === "all" || company.category === filters.category)
      && (filters.opportunity === "all" || company.status === filters.opportunity)
      && (!onlyOpportunities || company.status !== "good");
  });
}

export function demonstrationMessage(company: ProspectCompany, tone: string) {
  const greeting = tone === "Objetivo" ? "Olá!" : "Olá, tudo bem?";
  return `${greeting}\n\nSomos da AG Soluções Digitais. Preparamos uma ideia de presença digital para ${company.name}, pensando no segmento de ${company.category.toLocaleLowerCase("pt-BR")} e na apresentação dos seus serviços.\n\nPodemos conversar sobre um site profissional que ajude seus clientes a conhecer melhor a empresa?\n\nEste é um texto de exemplo para demonstração, sem envio automático.`;
}
