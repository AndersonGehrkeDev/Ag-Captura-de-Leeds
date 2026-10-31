import { test, expect, type Page } from "@playwright/test";
import { searchLocationId, searchSourceId, searchTestWorkspace } from "../fixtures/search-catalog.mjs";

async function loginSearch(page: Page, user: number) {
  await page.goto("http://127.0.0.1:3103/login?next=/prospeccao");
  await page.getByLabel("E-mail", { exact: true }).fill(`search-${user}@example.test`);
  await page.getByLabel("Senha", { exact: true }).fill("SyntheticStrong42");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page.getByText("Catálogo SINTÉTICO de teste", { exact: true }).first()).toBeVisible();
  const expand = page.getByRole("button", { name: "Expandir filtros", exact: true });
  if (await expand.isVisible()) await expand.click();
  await expect(page.getByRole("button", { name: "Buscar empresas", exact: true })).toBeEnabled();
}
const dimensions = [[360, 800], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1536, 1024], [800, 360], [844, 390]] as const;
for (const [index, [width, height]] of dimensions.entries()) test(`busca e detalhes em ${width}x${height}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height });
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const externalCalls: string[] = []; page.on("request", (request) => { if (/googleapis|openai\.com/.test(request.url())) externalCalls.push(request.url()); });
  await loginSearch(page, index + 1);
  const search = page.getByRole("button", { name: "Buscar empresas", exact: true });
  const size = await search.boundingBox(); expect(size?.height).toBeGreaterThanOrEqual(44);
  await search.click(); await expect(page.getByRole("heading", { name: "20 resultados carregados" })).toBeVisible();
  await expect(page.getByText("Resultados parciais.", { exact: false })).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible(); // lead real da fixture SQL, independente dos resultados.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("busca-livre.png"), fullPage: true });
  await page.screenshot({ path: info.outputPath("busca-livre-viewport.png") });
  await expect(page.getByRole("link", { name: "Pular para o conteúdo", exact: true })).not.toBeFocused();
  await page.getByRole("button", { name: "Carregar mais resultados" }).click();
  await expect(page.getByRole("heading", { name: "40 resultados carregados" })).toBeVisible();
  await page.getByRole("button", { name: "Carregar mais resultados" }).click();
  await expect(page.getByRole("heading", { name: "60 resultados carregados" })).toBeVisible();
  await expect(page.getByText("Limite de 60 resultados por busca atingido.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Carregar mais resultados" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Lista", exact: true }).click();
  const details = page.getByRole("button", { name: "Ver detalhes de Pizzaria 01 [TESTE]", exact: true }).filter({ visible: true });
  await details.click();
  const scope = width < 1280 ? page.getByRole("dialog") : page.getByRole("complementary", { name: "Empresa selecionada" });
  await expect(scope.getByRole("heading", { name: "Pizzaria 01 [TESTE]" })).toBeVisible();
  await expect(scope.getByText("Não informada pela fonte", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("detalhes.png"), fullPage: true });
  await page.screenshot({ path: info.outputPath("detalhes-viewport.png") });
  if (width < 1280) { await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(details).toBeFocused(); }
  await page.getByRole("tab", { name: "Por nicho", exact: true }).click();
  await page.getByLabel("Nicho de atuação").selectOption("dental"); await search.click();
  await expect(page.getByRole("heading", { name: "20 resultados carregados" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver detalhes de Clínica odontológica 02 [TESTE]" }).filter({ visible: true })).toBeVisible();
  await page.getByRole("tab", { name: "Palavra-chave", exact: true }).click();
  await page.getByRole("textbox", { name: "Palavra-chave", exact: true }).fill("oficina mecânica"); await search.click();
  await expect(page.getByRole("heading", { name: "20 resultados carregados" })).toBeVisible();
  await page.getByLabel("Exibir nos resultados carregados").selectOption("known");
  await expect(page.locator(".results-footer")).toContainText("10 resultados filtrados");
  await page.getByRole("textbox", { name: "Palavra-chave", exact: true }).fill("inexistente"); await search.click();
  await expect(page.getByText("Nenhum resultado disponível para esta consulta.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Busca livre", exact: true }).click();
  await page.getByRole("radio", { name: "10 km", exact: true }).focus(); await page.keyboard.press("Space"); await search.click();
  await expect(page.getByText("não é limite municipal nem trajeto viário.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("raio.png"), fullPage: true });
  expect(errors).toEqual([]); expect(externalCalls).toEqual([]);
});

test("cancelamento, erro e nova tentativa preservam a consulta; resposta antiga não vence a nova", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await loginSearch(page, 9);
  let hold: (() => void) | undefined;
  await page.route("**/api/prospeccao", async (route) => {
    if (route.request().postDataJSON().operation !== "search") return route.continue();
    await new Promise<void>((resolve) => { hold = resolve; });
    await route.fulfill({ status: 503, json: { ok: false, error: { code: "not_configured", message: "Fonte indisponível [TESTE]." } } }).catch(() => {});
  });
  await page.getByRole("button", { name: "Buscar empresas", exact: true }).click();
  await expect(page.getByText("Consultando a fonte autorizada…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar busca", exact: true }).first().click();
  await expect(page.getByText("Consulta cancelada.", { exact: false })).toBeVisible();
  hold?.(); await page.unroute("**/api/prospeccao");
  await page.route("**/api/prospeccao", (route) => route.request().postDataJSON().operation === "search" ? route.fulfill({ status: 429, headers: { "Retry-After": "60" }, json: { ok: false, error: { code: "rate_limited", message: "Aguarde antes de tentar novamente [TESTE]." } } }) : route.continue());
  await page.getByRole("button", { name: "Buscar empresas", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Aguarde antes de tentar novamente [TESTE].");
  await page.unroute("**/api/prospeccao");
  await page.getByRole("button", { name: "Tentar busca novamente" }).click();
  await expect(page.getByRole("heading", { name: "20 resultados carregados" })).toBeVisible();
});

test("endpoint rejeita sessão ausente, origem externa, entrada inválida e workspace alheio", async ({ page, request }) => {
  const endpoint = "http://127.0.0.1:3103/api/prospeccao";
  const command = { operation: "options", workspaceId: searchTestWorkspace };
  const anonymous = await request.post(endpoint, { headers: { Origin: "http://127.0.0.1:3103" }, data: command }); expect(anonymous.status()).toBe(403);
  await loginSearch(page, 10);
  const response = await page.request.post(endpoint, { headers: { Origin: "http://127.0.0.1:3103" }, data: command }); expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toContain("no-store");
  const other = await page.request.post(endpoint, { headers: { Origin: "http://127.0.0.1:3103" }, data: { ...command, workspaceId: "00000000-0000-4000-8000-000000000002" } }); expect(other.status()).toBe(403);
  const origin = await page.request.post(endpoint, { headers: { Origin: "https://evil.test" }, data: command }); expect(origin.status()).toBe(403);
  const invalid = await page.request.post(endpoint, { headers: { Origin: "http://127.0.0.1:3103" }, data: { operation: "search", workspaceId: searchTestWorkspace, request: { sourceId: searchSourceId, locationId: searchLocationId, pageSize: 9999 } } }); expect(invalid.status()).toBe(400);
  const oversized = await page.request.post(endpoint, { headers: { Origin: "http://127.0.0.1:3103" }, data: { ...command, payload: "a".repeat(9000) } }); expect(oversized.status()).toBe(400);
});
