import { describe, expect, it } from "vitest";
import { inspectResource, type Environment } from "../../domain/configuration";
import { resourceDefinitions } from "./definitions";

function report(env: Environment) {
  return resourceDefinitions.map((definition) => inspectResource(definition, env));
}

describe("configuração isolada por recurso", () => {
  it("permite executar a aplicação sem nenhuma integração", () => {
    const statuses = report({});
    expect(statuses.find((item) => item.id === "app")?.state).toBe("present");
    expect(statuses.filter((item) => item.id !== "app").every((item) => item.state === "missing")).toBe(true);
  });

  it("não deixa uma configuração inválida bloquear os demais recursos", () => {
    const statuses = report({
      NEXT_PUBLIC_SUPABASE_URL: "javascript:invalid",
      GOOGLE_PLACES_API_KEY: "unit-test-synthetic-token",
    });
    expect(statuses.find((item) => item.id === "supabase")?.state).toBe("invalid");
    expect(statuses.find((item) => item.id === "places")?.state).toBe("present");
    expect(statuses.find((item) => item.id === "openai")?.state).toBe("missing");
  });

  it("exige todos os campos apenas do recurso solicitado", () => {
    const status = report({ OPENAI_API_KEY: "unit-test-synthetic-token" }).find((item) => item.id === "openai");
    expect(status?.issues).toEqual([{ variable: "OPENAI_MODEL", reason: "missing" }]);
    expect(status?.state).toBe("missing");
  });

  it.each(["", "   "])("trata valor em branco como ausente: %j", (value) => {
    expect(report({ GOOGLE_PLACES_API_KEY: value }).find((item) => item.id === "places")?.state).toBe("missing");
  });

  it.each(["sua-chave", "your-key", "<OPENAI_API_KEY>", "placeholder", "a key with spaces"])("rejeita exemplos e formatos inválidos: %s", (value) => {
    expect(report({ OPENAI_API_KEY: value }).find((item) => item.id === "openai")?.state).toBe("invalid");
  });

  it.each(["ftp://domain.test", "https://name:password@domain.test", "not-a-url"])("rejeita URL imprópria sem derrubar a interface: %s", (value) => {
    expect(report({ NEXT_PUBLIC_APP_URL: value }).find((item) => item.id === "app")?.state).toBe("invalid");
  });

  it("não retorna valores nem mesmo em erros de validação", () => {
    const syntheticSecret = "synthetic-test-value-with invalid-format";
    const serialized = JSON.stringify(report({ OPENAI_API_KEY: syntheticSecret }));
    expect(serialized).not.toContain(syntheticSecret);
    expect(serialized).toContain("OPENAI_API_KEY");
    expect(serialized).not.toContain("ZodError");
  });

  it("não exige Map ID da busca nem usa a chave do servidor como chave do mapa", () => {
    const statuses = report({ GOOGLE_PLACES_API_KEY: "unit-test-synthetic-token" });
    expect(statuses.find((item) => item.id === "places")?.state).toBe("present");
    expect(statuses.find((item) => item.id === "maps")?.issues).toEqual([
      { variable: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", reason: "missing" },
      { variable: "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", reason: "missing" },
    ]);
  });
});
