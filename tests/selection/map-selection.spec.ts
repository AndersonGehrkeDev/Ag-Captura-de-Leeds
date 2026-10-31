import { test, expect } from "@playwright/test";

for (const [width, height] of [[1366, 768], [390, 844]] as const) test(`seleção sincronizada em ${width}x${height}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height });
  const detailsRequests: string[] = []; const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (/googleapis\.com|www\.google\.com/.test(request.url())) externalRequests.push(request.url());
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/prospeccao") {
      const command = request.postDataJSON(); if (command.operation === "details") detailsRequests.push(command.request.reference);
    }
  });
  await page.goto("/login?next=/prospeccao");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(`search-${width < 1280 ? 2 : 1}@example.test`);
  await page.getByLabel("Senha", { exact: true }).fill("SyntheticStrong42");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page.getByText("Catálogo SINTÉTICO de teste", { exact: true }).first()).toBeVisible();
  const expand = page.getByRole("button", { name: "Expandir filtros" }); if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Buscar empresas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "20 resultados carregados" })).toBeVisible();
  expect(detailsRequests).toHaveLength(0);
  await page.getByRole("tab", { name: "Mapa", exact: true }).click();
  const map = page.getByRole("region", { name: "Mapa de coordenadas da fonte autorizada" });
  await expect(map).toBeVisible();
  await map.getByRole("button", { name: /^Abrir grupo com/ }).first().click();
  const marker = map.getByRole("region", { name: "Empresas do agrupamento" }).getByRole("button", { name: "Oficina mecânica 03 [TESTE]", exact: true });
  await marker.click();
  const panel = width < 1280 ? page.getByRole("dialog") : page.getByRole("complementary", { name: "Empresa selecionada" });
  await expect(panel.getByRole("heading", { name: "Oficina mecânica 03 [TESTE]", exact: true })).toBeVisible();
  expect(detailsRequests).toEqual(["OWN_SYNTHETIC_2"]);
  // O CRM foi conectado depois deste teste. Sem executor configurado, a tentativa
  // deve ser recusada no servidor e nunca apresentada como lead salvo.
  const crmResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/crm" && response.request().method() === "POST");
  await panel.getByRole("button", { name: "Adicionar lead", exact: true }).click();
  const refused = await crmResponse;
  expect(refused.status()).toBe(503);
  expect(await refused.json()).toMatchObject({ ok: false, error: { code: "not_configured" } });
  await expect(panel.getByRole("status")).toContainText("CRM precisa de Supabase");
  await expect(panel.getByRole("button", { name: "Lead no CRM", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("link", { name: "Abrir lead no CRM", exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: "Abrir no Google Maps", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("A política da fonte não permite");
  await panel.getByRole("tab", { name: "Anotações", exact: true }).click();
  await panel.getByRole("textbox", { name: "Anotações de Oficina mecânica 03 [TESTE]" }).fill("Rascunho local da seleção [TESTE]");
  await expect(panel.getByText(/Rascunho local, não salvo no CRM/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("selecao-marcador.png") });
  if (width < 1280) { await page.keyboard.press("Escape"); await expect(marker).toBeFocused(); }
  await expect(map.locator(".source-map-marker[aria-pressed=true]")).toHaveCount(1);
  await page.getByRole("tab", { name: "Lista", exact: true }).click();
  const firstRow = width < 768 ? page.locator(".company-cards .company-card.selected") : page.locator(".companies-table tr[data-selected=true]");
  await expect(firstRow).toContainText("Oficina mecânica 03 [TESTE]");
  await page.getByRole("button", { name: "Ver detalhes de Pizzaria 01 [TESTE]", exact: true }).filter({ visible: true }).click();
  await expect(panel.getByRole("heading", { name: "Pizzaria 01 [TESTE]", exact: true })).toBeVisible();
  expect(detailsRequests).toEqual(["OWN_SYNTHETIC_2", "OWN_SYNTHETIC_0"]);
  if (width < 1280) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ver detalhes de Oficina mecânica 03 [TESTE]", exact: true }).filter({ visible: true }).click();
  await expect(panel.getByRole("heading", { name: "Oficina mecânica 03 [TESTE]" })).toBeVisible();
  await panel.getByRole("tab", { name: "Anotações", exact: true }).click();
  await expect(panel.getByRole("textbox", { name: "Anotações de Oficina mecânica 03 [TESTE]" })).toHaveValue("Rascunho local da seleção [TESTE]");
  if (width < 1280) await page.keyboard.press("Escape");
  await page.getByLabel("Exibir nos resultados carregados").selectOption("known");
  await expect(page.locator(".results-footer")).toContainText("10 resultados filtrados");
  await page.getByRole("tab", { name: "Mapa", exact: true }).click();
  await expect(map.getByText(/10 de 10 resultados filtrados com coordenadas/)).toBeVisible();
  await expect(map.locator(".source-map-marker[aria-pressed=true]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: info.outputPath("mapa-filtrado.png") });
});
