import { test, expect } from "@playwright/test";

const dimensions = [
  [360,800], [390,844], [768,1024], [1024,768], [1366,768],
  [1536,960], [1536,1024], [800,360], [844,390],
] as const;

for (const [width,height] of dimensions) {
  test(`prospecção ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width,height });
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(request.url()).hostname)) external.push(request.url()); });
    await page.goto("/prospeccao/demonstracao");
    await expect(page.getByRole("heading", { name: "Prospecção de Empresas", exact: true })).toBeVisible();
    await expect(page.getByText("Modo demonstração", { exact:true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("region", { name:"Mapa ilustrativo de empresas fictícias" })).toBeVisible();
    await expect(page.locator(".metric-all strong")).toHaveText("8");
    await expect(page.locator(".metric-missing strong")).toHaveText("4");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width >= 1280) {
      expect((await page.locator(".ag-sidebar").boundingBox())?.width).toBe(238);
      expect((await page.locator(".company-sidebar").boundingBox())?.width).toBe(335);
      const mainBox = await page.locator(".prospecting-main").boundingBox();
      const sideBox = await page.locator(".company-sidebar").boundingBox();
      expect(mainBox!.x + mainBox!.width).toBeLessThan(sideBox!.x);
      await expect(page.locator(".company-sidebar").getByRole("heading", { name:"Forno da Vila" })).toBeVisible();
    }
    await page.screenshot({ path:testInfo.outputPath("prospeccao.png"), animations:"disabled" });
    await page.screenshot({ path:testInfo.outputPath("prospeccao-completa.png"), fullPage:true, animations:"disabled" });
    await page.getByRole("tab", { name:"Lista", exact:true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path:testInfo.outputPath("lista.png"), fullPage:true, animations:"disabled" });
    const detailTrigger = width < 768 ? page.getByRole("button", { name:"Ver detalhes", exact:true }).first() : page.locator(".company-select").first();
    await detailTrigger.click();
    if (width < 1280) {
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await page.screenshot({ path:testInfo.outputPath("detalhes.png"), animations:"disabled" });
      await drawer.getByRole("tab", { name:"Anotações", exact:true }).click();
      await drawer.getByLabel("Anotações desta empresa").fill("Retomar conversa de exemplo.");
      await page.keyboard.press("Escape");
      await expect(drawer).not.toBeVisible();
      await expect(detailTrigger).toBeFocused();
    }
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
}

test("sem sessão exige login e mantém demonstração explícita", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByText("Modo demonstração", { exact:true })).not.toBeVisible();
  await page.getByRole("link", { name:/Explorar demonstração/ }).click();
  await expect(page.locator(".metric-all strong")).toHaveText("8");
  await page.getByRole("link", { name:"Sair da demonstração", exact:true }).filter({ visible:true }).click();
  await expect(page).toHaveURL(/\/login\?/);
});

test("filtros, leads, anotações e mensagem funcionam somente nas fixtures", async ({ page }) => {
  await page.setViewportSize({ width:1536,height:1024 });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/prospeccao/demonstracao");
  const sidebar = page.locator(".company-sidebar");
  await sidebar.getByRole("button", { name:"Adicionar aos meus leads", exact:true }).click();
  await expect(page.locator(".metric-leads strong")).toHaveText("2");
  await sidebar.getByRole("button", { name:"Adicionado aos leads de exemplo", exact:true }).click();
  await expect(page.locator(".metric-leads strong")).toHaveText("2");
  await sidebar.getByRole("tab", { name:"Anotações", exact:true }).click();
  await sidebar.getByLabel("Anotações desta empresa").fill("Anotação sintética");
  await page.locator(".company-select").filter({ hasText:"Clínica Horizonte" }).click();
  await page.locator(".company-select").filter({ hasText:"Forno da Vila" }).click();
  await sidebar.getByRole("tab", { name:"Anotações", exact:true }).click();
  await expect(sidebar.getByLabel("Anotações desta empresa")).toHaveValue("Anotação sintética");
  await sidebar.getByRole("tab", { name:"Mensagem com IA", exact:true }).click();
  const message = sidebar.getByRole("textbox", { name:"Mensagem para Forno da Vila" });
  await message.fill("Mensagem sintética editada.");
  await sidebar.getByRole("button", { name:"Copiar mensagem", exact:true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Mensagem sintética editada.");
  await page.getByRole("tab", { name:"Por nicho", exact:true }).click();
  await page.getByLabel("Nicho de atuação").selectOption("Restaurante");
  await page.getByRole("button", { name:"Buscar empresas", exact:true }).click();
  await expect(page.locator(".metric-all strong")).toHaveText("2");
  await page.getByRole("tab", { name:"Palavra-chave", exact:true }).click();
  await page.getByRole("textbox", { name:"Palavra-chave", exact:true }).fill("inexistente");
  await page.getByRole("button", { name:"Buscar empresas", exact:true }).click();
  await expect(page.locator(".metric-all strong")).toHaveText("0");
  await expect(page.getByRole("heading", { name:"Nenhum exemplo para estes filtros" })).toBeVisible();
});

test("busca global aplica somente a pesquisa nos exemplos", async ({ page }) => {
  await page.goto("/prospeccao/demonstracao");
  await page.getByRole("searchbox", { name:"Busca global" }).fill("Horizonte");
  await page.getByRole("button", { name:"Pesquisar na plataforma" }).click();
  await expect(page.locator(".metric-all strong")).toHaveText("1");
  await expect(page.getByText("Modo demonstração", { exact:true }).filter({ visible:true })).toBeVisible();
});
