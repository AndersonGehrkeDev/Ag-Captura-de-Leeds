import { test, expect } from "@playwright/test";
import { login } from "./auth-helpers";

const viewports = [
  { width: 360, height: 800 }, { width: 390, height: 844 },
  { width: 768, height: 1024 }, { width: 1024, height: 768 },
  { width: 1366, height: 768 }, { width: 1536, height: 960 },
  { width: 800, height: 360 }, { width: 844, height: 390 },
];

for (const viewport of viewports) {
  test(`base e configurações em ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const externalRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(request.url());
    });
    await login(page, "member-a@example.test", "/base");
    await expect(page.getByRole("heading", { name: "Uma base organizada para a sua prospecção." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sem dados simulados" })).toBeVisible();
    await expect(page.getByText("Precisa de configuração", { exact: true })).toHaveCount(4);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("base.png"), fullPage: true });

    if (viewport.width < 1024) {
      const trigger = page.getByRole("button", { name: "Abrir menu" });
      const box = await trigger.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await trigger.tap();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect.poll(async () => (await dialog.boundingBox())?.x).toBe(0);
      const closeBox = await dialog.getByRole("button", { name: "Fechar menu" }).boundingBox();
      expect(closeBox?.width).toBeGreaterThanOrEqual(44);
      expect(closeBox?.height).toBeGreaterThanOrEqual(44);
      for (let step = 0; step < 4; step++) {
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      }
      expect(await dialog.evaluate((element) => element.scrollHeight >= element.clientHeight)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("menu.png"), animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.getByRole("navigation", { name: "Navegação móvel" }).getByRole("link", { name: "Configurações" }).click();
      await expect(dialog).not.toBeVisible();
    } else {
      await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Configurações" }).click();
    }

    await expect(page).toHaveURL(/\/configuracoes$/);
    await expect(page.getByRole("heading", { name: "Configurações por recurso" })).toBeVisible();
    await expect(page.getByText("Configuração pendente", { exact: true })).toHaveCount(4);
    await expect(page.getByText("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("configuracoes.png"), fullPage: true });
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });
}

test("atalho de teclado dá acesso direto ao conteúdo", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
