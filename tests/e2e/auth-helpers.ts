import { expect, type Page } from "@playwright/test";
export async function login(page: Page, email = "member-a@example.test", next = "/perfil") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SyntheticStrong42");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page).toHaveURL(next);
}
