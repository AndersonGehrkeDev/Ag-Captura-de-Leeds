import { describe, expect, it } from "vitest";
import { demoCompanies } from "../../../demo/prospect-companies";
import { defaultFilters, filterCompanies } from "./company";

describe("filtros da demonstração", () => {
  it("exibe apenas as fixtures e recusa região fora do cenário", () => {
    expect(filterCompanies(demoCompanies, defaultFilters, "", false)).toHaveLength(8);
    expect(filterCompanies(demoCompanies, { ...defaultFilters, location: "Recife" }, "", false)).toHaveLength(0);
    expect(filterCompanies([], defaultFilters, "", false)).toHaveLength(0);
  });
  it("pesquisa sem depender de acentos ou caixa", () => {
    expect(filterCompanies(demoCompanies, defaultFilters, "CLINICA", false).map((item) => item.id)).toEqual(["demo-clinica"]);
  });
  it("filtra nicho e oportunidade conjuntamente", () => {
    const result = filterCompanies(demoCompanies, { ...defaultFilters, mode: "category", category: "Restaurante", opportunity: "missing" }, "", false);
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.category === "Restaurante" && item.status === "missing")).toBe(true);
  });
  it("exclui sites adequados quando solicitado sem inventar outros resultados", () => {
    expect(filterCompanies(demoCompanies, defaultFilters, "", true)).toHaveLength(6);
    expect(filterCompanies(demoCompanies, { ...defaultFilters, mode: "keyword", term: "não existe" }, "", false)).toHaveLength(0);
  });
});
