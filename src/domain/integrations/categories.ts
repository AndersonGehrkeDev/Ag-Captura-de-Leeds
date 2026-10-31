// Vocabulário do catálogo próprio; Google é apenas mapeamento documentado, sem chamadas liberadas.
export const businessCategories = [
  { id: "restaurants", label: "Restaurantes", terms: ["restaurante", "restaurant"], googleTypes: ["restaurant"] },
  { id: "pizza", label: "Pizzarias", terms: ["pizzaria", "pizza"], googleTypes: ["pizza_restaurant"] },
  { id: "dental", label: "Clínicas odontológicas", terms: ["odontolog", "dentista", "dentist", "dental"], googleTypes: ["dentist", "dental_clinic"] },
  { id: "repair", label: "Oficinas mecânicas", terms: ["oficina mecanica", "auto center", "car_repair"], googleTypes: ["car_repair"] },
  { id: "beauty", label: "Salões de beleza", terms: ["salao de beleza", "beauty_salon"], googleTypes: ["beauty_salon"] },
  { id: "markets", label: "Supermercados", terms: ["supermercado", "supermarket"], googleTypes: ["supermarket"] },
] as const;
export const normalizeSearchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
export function matchesCategory(category: string, id: string) {
  const selected = businessCategories.find((entry) => entry.id === id);
  return selected ? selected.terms.some((term) => normalizeSearchText(category).includes(term)) : false;
}
