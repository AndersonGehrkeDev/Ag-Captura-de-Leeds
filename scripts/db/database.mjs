import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

// Exclusivamente teste local. Não é uma implementação de Auth nem valida assinatura JWT.
const authHarness = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
 id uuid primary key, email text unique, email_confirmed_at timestamptz,
 raw_user_meta_data jsonb not null default '{}', raw_app_meta_data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
revoke all on auth.users from public, anon, authenticated;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
   nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
`;

export async function createTestDatabase({ throughMigration } = {}) {
  const db = new PGlite();
  try {
    await db.exec(authHarness);
    const directory = new URL("../../supabase/migrations/", import.meta.url);
    const available = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    if (throughMigration && !available.includes(throughMigration)) throw new Error("Migração limite inexistente no harness de teste.");
    const migrations = available.filter((name) => !throughMigration || name <= throughMigration);
    for (const migration of migrations) {
      try { await db.exec(await readFile(new URL(migration, directory), "utf8")); }
      catch (error) { throw new Error(`Falha na migração ${migration}: ${error.message}`, { cause: error }); }
    }
    return { db, migrations };
  } catch (error) { await db.close(); throw error; }
}

export async function applyDevelopmentSeed(db) {
  await db.exec("begin; set local ag.allow_development_seed = 'yes-local-only';");
  try {
    await db.exec(await readFile(new URL("../../supabase/seeds/development.sql", import.meta.url), "utf8"));
    await db.exec("commit;");
  } catch (error) { await db.exec("rollback;"); throw error; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { db, migrations } = await createTestDatabase();
  try {
    const version = (await db.query("select version() as version")).rows[0].version;
    const { rows } = await db.query("select count(*)::integer as tables from pg_tables where schemaname='public'");
    console.log(JSON.stringify({ engine: version, migrations, publicTables: rows[0].tables }));
  } finally { await db.close(); }
}
