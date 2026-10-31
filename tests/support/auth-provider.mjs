// Servidor descartável EXCLUSIVO dos testes. Não é Supabase/GoTrue/PostgREST.
// Exercita o SDK SSR por HTTP e executa o SQL/RLS real em PGlite, sem chaves externas.
import { createServer } from "node:http";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createTestDatabase, applyDevelopmentSeed } from "../../scripts/db/database.mjs";

const { db } = await createTestDatabase();
await applyDevelopmentSeed(db);
if (process.env.MENU_FIXTURE === "true") {
  await db.query("insert into private.crm_executor_config(singleton,secret_sha256) values(true,encode(sha256(convert_to($1,'UTF8')),'hex'))", ["b".repeat(64)]);
  await db.exec("insert into public.message_templates(id,workspace_id,name,body,created_by) values('e1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Modelo autorizado [TESTE-MENU]','Criação de sites profissionais [TESTE-MENU]','10000000-0000-4000-8000-000000000001')");
}
// Identidades exclusivas da matriz de busca, sem interferir em logout/revogação da suíte Auth.
for (let index = 1; index <= 10; index++) {
  const id = `11000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)", [id, `search-${index}@example.test`, JSON.stringify({ name: `Busca ${index} [TESTE]` })]);
  await db.query("insert into public.workspace_members(workspace_id,user_id,role,created_by) values('00000000-0000-4000-8000-000000000001',$1,'member','10000000-0000-4000-8000-000000000001')", [id]);
}
await db.query("insert into auth.users(id,email,raw_user_meta_data) values('10000000-0000-4000-8000-000000000007','new-invite@example.test','{\"name\":\"Convite HTTP [TESTE]\"}')");
const users = new Map();
const sessions = new Map();
const refreshes = new Map();
const mail = new Map();
const signingKey = randomBytes(32);
const password = "SyntheticStrong42";
for (const user of (await db.query("select * from auth.users")).rows) users.set(user.email, { ...user, password });
let queue = Promise.resolve();
function exclusive(callback) { const run = queue.then(callback); queue = run.catch(() => {}); return run; }
function sql(user, callback) {
  return exclusive(async () => {
    await db.exec("begin; set local role authenticated;");
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user.id]);
      const result = await callback();
      await db.exec("set constraints all immediate; commit;");
      return result;
    } catch (error) { await db.exec("rollback;"); throw error; }
  });
}
function publicUser(user) {
  return { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", email_confirmed_at: user.email_confirmed_at, confirmed_at: user.email_confirmed_at, created_at: user.created_at, updated_at: new Date().toISOString(), app_metadata: { provider: "email", providers: ["email"] }, user_metadata: user.raw_user_meta_data, identities: [] };
}
function jwt(payload) {
  const raw = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  return `${raw}.${createHmac("sha256", signingKey).update(raw).digest("base64url")}`;
}
function issue(user) {
  const now = Math.floor(Date.now() / 1000);
  const sid = randomUUID();
  const access = jwt({ sub: user.id, aud: "authenticated", role: "authenticated", email: user.email, iat: now, exp: now + 3600, session_id: sid, iss: "http://127.0.0.1:54331/auth/v1" });
  const refresh = randomBytes(32).toString("hex");
  const result = { access_token: access, refresh_token: refresh, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user: publicUser(user) };
  sessions.set(access, { user, sid }); refreshes.set(refresh, access);
  return result;
}
function identity(request) {
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  const session = sessions.get(token);
  if (!session) return null;
  const [header, payload, signature] = token.split(".");
  const expected = createHmac("sha256", signingKey).update(`${header}.${payload}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual) || JSON.parse(Buffer.from(payload, "base64url")).exp <= Date.now() / 1000) return null;
  return session.user;
}
function send(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(status === 204 ? undefined : JSON.stringify(data));
}
function error(response, status, code) { send(response, status, { code, error_code: code, msg: code, message: code }); }
const tables = {
  leads: ["id", "workspace_id", "stage", "archived_at", "do_not_contact"],
  profiles: ["id", "display_name", "locale"],
  workspaces: ["id", "name", "slug", "state"],
  workspace_members: ["workspace_id", "user_id", "role", "created_at"],
  workspace_invitations: ["id", "email", "workspace_id", "role", "expires_at", "accepted_at", "revoked_at", "created_at"],
  crm_tasks: ["id", "workspace_id", "title", "due_at", "completed_at", "created_by", "assigned_to", "created_at"],
  message_templates: ["id", "workspace_id", "name", "body", "tone", "archived_at", "updated_at", "created_at"],
  campaigns: ["id", "workspace_id", "name", "description", "template_id", "status", "updated_at", "created_at"],
  campaign_leads: ["id", "workspace_id", "campaign_id", "lead_id", "status", "updated_at", "created_at"],
  usage_counters: ["resource", "workspace_id", "period_start", "period_end", "unit_limit", "used_units", "reserved_units"],
};
const functions = {
  ag_list_my_invitations: [], ag_accept_invitation_by_id: ["p_invitation"],
  ag_create_invitation: ["p_workspace", "p_email", "p_role"], ag_revoke_invitation: ["p_workspace", "p_invitation"],
  ag_change_member_role: ["p_workspace", "p_user", "p_role"], ag_remove_member: ["p_workspace", "p_user"], ag_transfer_ownership: ["p_workspace", "p_user"],
  ag_crm: ["p_workspace", "p_action", "p_input", "p_executor"],
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:54331");
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    if (url.pathname === "/__health") return send(response, 200, { fixture: true });
    // Controle de teste só neste processo loopback, ausente do aplicativo.
    if (url.pathname === "/__test/mail") {
      const entry = mail.get(url.searchParams.get("email"));
      return send(response, 200, entry ? { token: entry.token, type: entry.type, code: entry.code } : null);
    }
    if (url.pathname === "/__test/token") {
      const user = users.get(body.email);
      if (!user) return error(response, 404, "user_not_found");
      const token = randomBytes(32).toString("hex");
      mail.set(body.email, { token, type: body.type, user, expires: body.expired ? 0 : Date.now() + 3600000, used: false });
      return send(response, 200, { token });
    }
    if (url.pathname === "/__test/revoke") {
      for (const [token, session] of sessions) if (session.user.email === body.email) sessions.delete(token);
      return send(response, 200, {});
    }
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      const user = users.get(body.email);
      if (!user || user.password !== body.password) return error(response, 400, "invalid_credentials");
      if (!user.email_confirmed_at) return error(response, 400, "email_not_confirmed");
      return send(response, 200, issue(user));
    }
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
      const previous = refreshes.get(body.refresh_token);
      const user = sessions.get(previous)?.user;
      if (!user) return error(response, 400, "refresh_token_not_found");
      return send(response, 200, issue(user));
    }
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "pkce") {
      const entry = [...mail.values()].find((entry) => entry.code === body.auth_code);
      const challenge = createHash("sha256").update(body.code_verifier || "").digest("base64url");
      if (!entry || entry.used || entry.challenge !== challenge) return error(response, 400, "bad_code_verifier");
      entry.used = true;
      return send(response, 200, issue(entry.user));
    }
    if (url.pathname === "/auth/v1/recover") {
      const user = users.get(body.email);
      if (body.email === "slow@example.test") await new Promise((resolve) => setTimeout(resolve, 600));
      if (user) mail.set(body.email, { token: randomBytes(32).toString("hex"), code: randomUUID(), challenge: body.code_challenge, type: "recovery", user, expires: Date.now() + 3600000, used: false });
      return send(response, 200, {});
    }
    if (url.pathname === "/auth/v1/signup") {
      // Simula o provedor com signup habilitado para o servidor de teste 3102.
      // O servidor principal 3100 mantém sua própria configuração de signup fechada.
      if (users.has(body.email)) return send(response, 200, publicUser(users.get(body.email)));
      const id = randomUUID();
      const record = await exclusive(() => db.query("insert into auth.users(id,email) values($1,$2) returning *", [id, body.email]));
      const user = { ...record.rows[0], password: body.password };
      users.set(body.email, user);
      mail.set(body.email, { token: randomBytes(32).toString("hex"), type: "email", user, expires: Date.now() + 3600000, used: false });
      return send(response, 200, publicUser(user));
    }
    if (url.pathname === "/auth/v1/verify") {
      const entry = [...mail.values()].find((entry) => entry.token === body.token_hash);
      if (!entry || entry.used || entry.expires < Date.now() || entry.type !== body.type) return error(response, 403, "otp_expired");
      entry.used = true; entry.user.email_confirmed_at = new Date().toISOString();
      await exclusive(() => db.query("update auth.users set email_confirmed_at=now() where id=$1", [entry.user.id]));
      return send(response, 200, issue(entry.user));
    }
    if (url.pathname.startsWith("/auth/v1/") || url.pathname.startsWith("/rest/v1/")) {
      const user = identity(request);
      if (!user) return error(response, 401, "session_not_found");
      if (url.pathname === "/auth/v1/user") {
        if (request.method === "PUT" && body.password) user.password = body.password;
        return send(response, 200, publicUser(user));
      }
      if (url.pathname === "/auth/v1/logout") {
        const token = request.headers.authorization.replace(/^Bearer /, "");
        for (const [key, entry] of sessions) if (key === token || (url.searchParams.get("scope") !== "local" && entry.user.id === user.id)) sessions.delete(key);
        return send(response, 204);
      }
      const name = url.pathname.split("/").at(-1);
      if (url.pathname.startsWith("/rest/v1/rpc/") && functions[name]) {
        const args = functions[name];
        const result = await sql(user, () => db.query(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`, args.map((key) => key === "p_input" ? JSON.stringify(body[key]) : body[key])));
        return send(response, 200, result.rows[0].result);
      }
      if (tables[name]) {
        const allowed = tables[name];
        const columns = (url.searchParams.get("select") || "*").split(",");
        if (columns.some((column) => !allowed.includes(column))) return error(response, 400, "fixture_columns");
        const params = []; const where = [];
        for (const [key, filter] of url.searchParams) {
          if (["select", "order", "limit", "offset"].includes(key)) continue;
          if (!allowed.includes(key)) return error(response, 400, "fixture_filter");
          if (filter === "is.null") { where.push(`${key} is null`); continue; }
          if (filter.startsWith("in.(")) {
            const values = filter.slice(4, -1).split(",").map((v) => v.replaceAll('"', ""));
            const refs = values.map((value) => { params.push(value); return `$${params.length}`; });
            where.push(`${key} in (${refs.join(",") || "null"})`); continue;
          }
          if (filter.startsWith("eq.") || filter.startsWith("gt.") || filter.startsWith("neq.")) { const neq = filter.startsWith("neq."); params.push(filter.slice(neq ? 4 : 3)); where.push(`${key}${neq ? "<>" : filter.startsWith("gt.") ? ">" : "="}$${params.length}`); }
          else return error(response, 400, "fixture_filter");
        }
        const condition = where.length ? ` where ${where.join(" and ")}` : "";
        let query = `select ${columns.join(",")} from public.${name}${condition}`;
        if (request.method === "HEAD") {
          const count = await sql(user, () => db.query(`select count(*)::int as total from public.${name}${condition}`, params));
          response.writeHead(200, { "Content-Type": "application/json", "Content-Range": `*/${count.rows[0].total}`, "Cache-Control": "no-store" }); return response.end();
        }
        if (request.method === "PATCH") {
          const fields = Object.keys(body);
          if (!fields.length || fields.some((key) => !allowed.includes(key))) return error(response, 400, "fixture_patch");
          const set = fields.map((key) => { params.push(body[key]); return `${key}=$${params.length}`; });
          query = `update public.${name} set ${set.join(",")}${condition} returning ${columns.join(",")}`;
        } else if (request.method === "POST") {
          const fields = Object.keys(body); if (!fields.length || fields.some((key) => !allowed.includes(key))) return error(response, 400, "fixture_insert");
          const values = fields.map((key) => { params.push(body[key]); return `$${params.length}`; }); query = `insert into public.${name}(${fields.join(",")}) values(${values.join(",")}) returning ${columns.join(",")}`;
        } else if (request.method === "DELETE") query = `delete from public.${name}${condition} returning ${columns.join(",")}`;
        else if (request.method === "GET") {
          const order = url.searchParams.get("order");
          if (order) {
            const parts = order.split(",").map((item) => item.split(".")); if (parts.some(([field, direction, nulls]) => !allowed.includes(field) || !["asc", "desc"].includes(direction) || (nulls && !["nullsfirst", "nullslast"].includes(nulls)))) return error(response, 400, "fixture_order");
            query += " order by " + parts.map(([field, direction, nulls]) => `${field} ${direction}${nulls ? nulls === "nullsfirst" ? " nulls first" : " nulls last" : ""}`).join(",");
          }
          const limit = url.searchParams.get("limit"); const offset = url.searchParams.get("offset");
          if (limit && !/^\d{1,4}$/.test(limit) || offset && !/^\d{1,5}$/.test(offset)) return error(response, 400, "fixture_limit");
          if (limit) query += ` limit ${Number(limit)}`; if (offset) query += ` offset ${Number(offset)}`;
        }
        const result = await sql(user, () => db.query(query, params));
        const single = request.headers.accept?.includes("application/vnd.pgrst.object+json");
        return send(response, 200, single ? result.rows[0] ?? null : result.rows);
      }
    }
    return error(response, 404, "fixture_route");
  } catch (caught) {
    // Não imprimir requisições, senhas ou tokens, inclusive nos testes.
    return send(response, 400, { code: caught.code || "fixture_error", message: "Operação recusada no banco de teste." });
  }
});
server.listen(54331, "127.0.0.1", () => console.log("Fixture HTTP Auth/RLS disponível apenas em 127.0.0.1:54331"));
async function close() { server.close(); await db.close(); process.exit(0); }
process.on("SIGTERM", close); process.on("SIGINT", close);
