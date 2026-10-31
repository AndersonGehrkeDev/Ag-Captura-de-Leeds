import type { ProspectCompany } from "@/features/prospeccao/domain/company";

// Dados inteiramente sintéticos. Não vieram do Google, de auditorias ou de um CRM.
// Não possuem telefones; domínios .example não devem ser abertos como sites reais.
export const demoCompanies: readonly ProspectCompany[] = [
  { id: "demo-forno", name: "Forno da Vila", category: "Restaurante", rating: 4.6, reviews: 48, website: null, status: "missing", address: "Rua Exemplo, 120 — Vila Ilustrativa, São Paulo", score: 85, initialLead: false, photo: "/demo/pizzaria-ficticia.png", position: { x: 35, y: 37 } },
  { id: "demo-bistro", name: "Bistrô Aurora", category: "Restaurante", rating: 4.3, reviews: 32, website: null, status: "missing", address: "Alameda Fictícia, 42 — Bairro Modelo, São Paulo", score: 78, initialLead: false, photo: "/demo/pizzaria-ficticia.png", position: { x: 65, y: 23 } },
  { id: "demo-clinica", name: "Clínica Horizonte", category: "Clínica médica", rating: 4.8, reviews: 67, website: "clinica-horizonte.example", status: "improve", address: "Avenida Modelo, 300 — Bairro Modelo, São Paulo", score: 72, initialLead: false, position: { x: 77, y: 48 } },
  { id: "demo-auto", name: "Oficina Ponto Norte", category: "Oficina mecânica", rating: 4.5, reviews: 25, website: "ponto-norte.example", status: "good", address: "Rua Ilustrativa, 80 — Vila Exemplo, São Paulo", score: 28, initialLead: false, position: { x: 25, y: 67 } },
  { id: "demo-estetica", name: "Ateliê Essência", category: "Centro de estética", rating: 4.9, reviews: 41, website: null, status: "missing", address: "Rua Exemplo, 215 — Vila Ilustrativa, São Paulo", score: 82, initialLead: false, position: { x: 52, y: 73 } },
  { id: "demo-construtora", name: "Construtora Prisma", category: "Construção civil", rating: 4.2, reviews: 19, website: "prisma-obras.example", status: "good", address: "Avenida Modelo, 115 — Bairro Modelo, São Paulo", score: 31, initialLead: true, position: { x: 54, y: 20 } },
  { id: "demo-clima", name: "Brisa Climatização", category: "Climatização", rating: 4.7, reviews: 36, website: null, status: "missing", address: "Travessa Fictícia, 18 — Vila Exemplo, São Paulo", score: 80, initialLead: false, position: { x: 16, y: 27 } },
  { id: "demo-mercado", name: "Mercado Boa Praça", category: "Supermercado", rating: 4.1, reviews: 54, website: "boa-praca.example", status: "improve", address: "Rua Ilustrativa, 660 — Bairro Modelo, São Paulo", score: 68, initialLead: false, position: { x: 83, y: 76 } },
];

export const demoPlan = { limit: 20, used: demoCompanies.length, label: "Profissional" } as const;
