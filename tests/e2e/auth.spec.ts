import { test, expect } from "@playwright/test";
import { login } from "./auth-helpers";

const fixture = "http://127.0.0.1:54331";
const viewports = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1366, height: 768 }, { width: 1536, height: 1024 }, { width: 844, height: 390 }];
for (const viewport of viewports) test(`autenticação e perfil em ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
  await page.setViewportSize(viewport);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const submit = page.getByRole("button", { name: "Entrar na plataforma" });
  const box = await submit.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath("login.png"), fullPage: true });
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page.getByRole("heading", { name: "Recupere seu acesso" })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("unknown@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta elegível");
  await page.screenshot({ path: info.outputPath("recuperacao.png"), fullPage: true });
  await login(page, "owner-a@example.test");
  await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("perfil.png"), fullPage: true });
  await page.goto("/redefinir-senha");
  await expect(page.getByLabel("Nova senha", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("redefinicao.png"), fullPage: true });
  await page.goto("/workspace/membros");
  await expect(page.getByLabel("E-mail do convidado")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("membros.png"), fullPage: true });
  await page.goto("/workspaces");
  await expect(page.getByRole("heading", { name: "Seus workspaces" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Acessar workspace" }).click();
  await expect(page).toHaveURL("/prospeccao");
  await expect(page.locator(".metric-all strong")).toHaveText("—");
  await expect(page.getByText("Mapas reais dependem de fonte e uso autorizados para esta plataforma.", { exact: true })).toBeVisible();
  const filters = page.getByRole("button", { name: "Expandir filtros", exact: true });
  if (await filters.isVisible()) await filters.click();
  await expect(page.getByText("A busca real depende de uma fonte própria ou licenciada autorizada para prospecção.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("prospeccao-sem-fonte.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("rotas privadas, redirecionamentos e ausência de configuração", async ({ page, request }) => {
  for (const route of ["/perfil", "/prospeccao", "/workspaces", "/workspace/membros", "/base", "/configuracoes", "/redefinir-senha"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?/);
  }
  await page.goto("/cadastro");
  await expect(page.getByRole("heading", { name: "Acesso por convite" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solicitar cadastro" })).toHaveCount(0);
  const response = await request.get("/auth/callback?code=invalid-code&next=https://evil.test", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("http://127.0.0.1:3100/login?aviso=link");
  expect(response.headers()["cache-control"]).toContain("no-store");
  const redirected = await request.get("/perfil", { maxRedirects: 0, headers: { "x-forwarded-host": "evil.test", host: "evil.test" } });
  const destination = new URL(redirected.headers().location!, "http://127.0.0.1:3100");
  expect(destination.origin).toBe("http://127.0.0.1:3100");
  expect(destination.pathname).toBe("/login");
  await page.goto("http://127.0.0.1:3101/login");
  await expect(page.getByText("Autenticação não configurada.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar na plataforma" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("credenciais inválidas e e-mail não confirmado", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("member-a@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Não foi possível entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("unverified@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("SyntheticStrong42");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Confirme seu e-mail");
});

test("perfil próprio, cookie de outro workspace recusado e logout", async ({ page, context }) => {
  await login(page, "owner-b@example.test");
  await page.getByLabel("Nome de exibição").fill("Proprietário B atualizado [TESTE]");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil atualizado.");
  await context.addCookies([{ name: "ag-workspace", value: "00000000-0000-4000-8000-000000000001", url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/prospeccao");
  await expect(page).toHaveURL(/\/workspaces\?aviso=acesso/);
  await expect(page.locator("main").getByRole("alert")).toContainText("não está disponível");
  await expect(page.getByRole("heading", { name: "AG Soluções Digitais", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Acessar workspace" }).click();
  await expect(page).toHaveURL("/prospeccao");
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair da conta" }).last().click();
  await expect(page).toHaveURL(/\/login\?aviso=saiu/);
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/login\?/);
  expect((await context.cookies()).find((cookie) => cookie.name === "ag-workspace")).toBeUndefined();
});

test("recuperação, confirmação explícita, redefinição, link usado e expirado", async ({ page, request }, info) => {
  // Conta exclusiva deste teste; nenhuma mensagem é enviada para fora da fixture.
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail", { exact: true }).fill("invitee@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta elegível");
  const mail = await (await request.get(`${fixture}/__test/mail?email=invitee@example.test`)).json();
  const link = `/auth/confirm?type=recovery&token_hash=${mail.token}`;
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Confirme seu acesso" })).toBeVisible();
  await page.reload(); // GET não consome o token.
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page).toHaveURL("/redefinir-senha");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("redefinicao.png"), fullPage: true });
  await page.getByLabel("Nova senha", { exact: true }).fill("SyntheticChanged43");
  await page.getByLabel("Confirme a nova senha").fill("SyntheticOther43");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("As senhas precisam ser iguais.");
  await page.getByLabel("Nova senha", { exact: true }).fill("SyntheticChanged43");
  await page.getByLabel("Confirme a nova senha").fill("SyntheticChanged43");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/login\?aviso=senha/);
  await page.getByLabel("E-mail", { exact: true }).fill("invitee@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("SyntheticChanged43");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page).toHaveURL("/workspaces");
  await page.goto(link);
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("expirou, já foi usado");
  const expired = await (await request.post(`${fixture}/__test/token`, { data: { email: "invitee@example.test", type: "recovery", expired: true } })).json();
  await page.goto(`/auth/confirm?type=recovery&token_hash=${expired.token}`);
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("expirou, já foi usado");
});

test("renovação de cookies e sessão revogada não autorizam conteúdo privado", async ({ page, context, request }) => {
  await login(page, "admin-a@example.test");
  const authCookie = (await context.cookies()).find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));
  expect(authCookie).toBeDefined();
  const stored = JSON.parse(Buffer.from(authCookie!.value.slice("base64-".length), "base64url").toString());
  const previousToken = stored.access_token;
  stored.expires_at = Math.floor(Date.now() / 1000) - 10;
  await context.addCookies([{ ...authCookie!, value: `base64-${Buffer.from(JSON.stringify(stored)).toString("base64url")}` }]);
  const response = await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const renewed = (await context.cookies()).find((cookie) => cookie.name === authCookie!.name)!;
  expect(JSON.parse(Buffer.from(renewed.value.slice(7), "base64url").toString()).access_token).not.toBe(previousToken);
  await request.post(`${fixture}/__test/revoke`, { data: { email: "admin-a@example.test" } });
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole("heading", { name: "Meu perfil" })).toHaveCount(0);
});

test("convite administrativo, aceite pela identidade e proteção do owner", async ({ page, context, browser, request }) => {
  await login(page, "owner-a@example.test", "/workspace/membros");
  const inviteForm = page.locator("form").filter({ has: page.getByLabel("E-mail do convidado") });
  await inviteForm.getByLabel("E-mail do convidado").fill("new-invite@example.test");
  await inviteForm.getByRole("button", { name: "Criar convite" }).click();
  await expect(inviteForm.getByRole("status")).toContainText("Não foi enviado e-mail");
  const member = page.locator(".member-row").filter({ hasText: "Membro A [DEV]" }).first();
  const remove = member.locator("form").filter({ has: page.getByRole("button", { name: "Remover membro" }) });
  await remove.evaluate((form) => { (form as HTMLFormElement).addEventListener("formdata", (event) => { event.formData.set("target_id", "10000000-0000-4000-8000-000000000001"); }); });
  await remove.getByRole("button", { name: "Remover membro" }).click();
  await expect(remove.getByRole("status")).toContainText("proprietário não pode ser removido");
  await page.goto("/workspaces");
  const workspaceForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Acessar workspace" }) });
  await workspaceForm.evaluate((form) => { (form as HTMLFormElement).addEventListener("formdata", (event) => { event.formData.set("workspace_id", "00000000-0000-4000-8000-000000000002"); }); });
  const submission = page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname === "/workspaces");
  await page.getByRole("button", { name: "Acessar workspace" }).click();
  expect((await submission).postData()).toContain("00000000-0000-4000-8000-000000000002");
  await expect(page.locator("main").getByRole("alert")).toHaveText("Você não tem acesso a este workspace.");
  expect((await context.cookies()).find((cookie) => cookie.name === "ag-workspace")).toBeUndefined();
  // Simula somente a chegada do e-mail do Auth: nenhum SMTP é exercitado.
  const token = await (await request.post(`${fixture}/__test/token`, { data: { email: "new-invite@example.test", type: "invite" } })).json();
  const recipientContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const recipient = await recipientContext.newPage();
  await recipient.goto(`/auth/confirm?type=invite&token_hash=${token.token}`);
  await recipient.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(recipient).toHaveURL(/\/redefinir-senha\?convite=1/);
  await recipient.getByLabel("Nova senha", { exact: true }).fill("SyntheticInvite42");
  await recipient.getByLabel("Confirme a nova senha").fill("SyntheticInvite42");
  await recipient.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(recipient).toHaveURL(/\/login\?aviso=senha/);
  await recipient.getByLabel("E-mail", { exact: true }).fill("new-invite@example.test");
  await recipient.getByLabel("Senha", { exact: true }).fill("SyntheticInvite42");
  await recipient.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(recipient).toHaveURL("/workspaces");
  await recipient.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(recipient).toHaveURL("/prospeccao");
  await recipient.goto("/workspace/membros");
  await expect(recipient.getByRole("heading", { name: "Membros e convites" })).toBeVisible();
  await expect(recipient.getByRole("button", { name: "Criar convite" })).toHaveCount(0);
  await recipient.goto("/workspaces");
  await expect(recipient.getByRole("button", { name: "Aceitar convite" })).toHaveCount(0);
  await recipientContext.close();
});

test("cadastro habilitado exige confirmação e não concede workspace", async ({ page, request }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3102/cadastro");
  await page.getByLabel("E-mail", { exact: true }).fill("public-signup@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("SyntheticStrong42");
  await page.getByRole("button", { name: "Solicitar cadastro" }).click();
  await expect(page.getByRole("status")).toContainText("você receberá as instruções");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("cadastro.png"), fullPage: true });
  const mail = await (await request.get(`${fixture}/__test/mail?email=public-signup@example.test`)).json();
  await page.goto(`http://127.0.0.1:3102/auth/confirm?type=email&token_hash=${mail.token}`);
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3102/workspaces");
  await expect(page.getByText(/Você ainda não pertence a um workspace/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Acessar workspace" })).toHaveCount(0);
});

test("callback PKCE verifica o código e preserva os cookies", async ({ page, request }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail", { exact: true }).fill("owner-b@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta elegível");
  const mail = await (await request.get(`${fixture}/__test/mail?email=owner-b@example.test`)).json();
  const response = await page.goto(`/auth/callback?code=${mail.code}&next=/redefinir-senha`);
  await expect(page).toHaveURL("/redefinir-senha");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Defina sua nova senha" })).toBeVisible();
});

test("envio pendente desabilita os controles e bloqueia duplicação", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail", { exact: true }).fill("slow@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("button", { name: "Aguarde…" })).toBeDisabled();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta elegível");
  await expect(page.getByRole("button", { name: "Enviar instruções" })).toBeEnabled();
});
