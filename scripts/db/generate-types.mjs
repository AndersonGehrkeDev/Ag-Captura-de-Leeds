import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createTestDatabase } from "./database.mjs";

const { db, migrations } = await createTestDatabase();
try {
  const enums = (await db.query(`select t.typname, json_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid
    where n.nspname='public' group by t.typname order by t.typname`)).rows;
  const enumNames = new Set(enums.map((item) => item.typname));
  const pgTypes = (await db.query(`select t.oid,t.typname,n.nspname,t.typelem from pg_type t join pg_namespace n on n.oid=t.typnamespace`)).rows;
  const types = new Map(pgTypes.map((item) => [Number(item.oid), item]));
  function typeFor(oid) {
    const type = types.get(Number(oid));
    if (!type) throw new Error(`Tipo PostgreSQL não encontrado: ${oid}`);
    if (type.typelem) return `(${typeFor(type.typelem)})[]`;
    if (type.nspname === "public" && enumNames.has(type.typname)) return `Database["public"]["Enums"][${JSON.stringify(type.typname)}]`;
    if (["uuid","text","varchar","bpchar","date","timestamp","timestamptz","time","timetz","name","interval"].includes(type.typname)) return "string";
    if (["int2","int4","int8","float4","float8","numeric","oid"].includes(type.typname)) return "number";
    if (type.typname === "bool") return "boolean";
    if (["json","jsonb"].includes(type.typname)) return "Json";
    if (type.typname === "void") return "undefined";
    throw new Error(`Mapeamento ausente para ${type.nspname}.${type.typname}; geração interrompida, sem usar any.`);
  }
  const columns = (await db.query(`select c.relname as table_name,a.attname as column_name,a.atttypid as type_oid,
    a.attnotnull as not_null, a.attgenerated <> '' as generated,
    (ad.oid is not null or a.attidentity <> '') as has_default
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum
    where n.nspname='public' and c.relkind='r' order by c.relname,a.attnum`)).rows;
  const relationships = (await db.query(`select src.relname as table_name, con.conname as name, dst.relname as referenced_relation,
    (select json_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=src.oid and a.attnum=k.attnum) as columns,
    (select json_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=dst.oid and a.attnum=k.attnum) as referenced_columns,
    exists(select 1 from pg_constraint u where u.conrelid=src.oid and u.contype in ('p','u') and u.conkey=con.conkey) as one_to_one
    from pg_constraint con join pg_class src on src.oid=con.conrelid join pg_namespace ns on ns.oid=src.relnamespace
    join pg_class dst on dst.oid=con.confrelid join pg_namespace nd on nd.oid=dst.relnamespace
    where con.contype='f' and ns.nspname='public' and nd.nspname='public' order by src.relname,con.conname`)).rows;
  const functions = (await db.query(`select p.proname,p.proargnames,p.proargtypes::oid[] as arg_types,p.pronargdefaults,p.prorettype
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ag_%' order by p.proname`)).rows;
  const checksum = createHash("sha256");
  for (const name of migrations) checksum.update(name).update(await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url)));
  const lines = [
    "// GERADO por scripts/db/generate-types.mjs a partir do catálogo PostgreSQL após aplicar as migrações.",
    "// Não editar manualmente. Os tipos não substituem RLS, grants ou validação de entradas.",
    `// SHA256 das migrações: ${checksum.digest("hex")}`,
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];",
    "", "export type Database = {", "  public: {", "    Tables: {",
  ];
  for (const table of [...new Set(columns.map((column) => column.table_name))]) {
    const tableColumns = columns.filter((column) => column.table_name === table);
    lines.push(`      ${table}: {`);
    for (const mode of ["Row", "Insert", "Update"]) {
      lines.push(`        ${mode}: {`);
      for (const column of tableColumns) {
        const optional = mode === "Update" || (mode === "Insert" && (column.has_default || !column.not_null || column.generated));
        const value = mode !== "Row" && column.generated ? "never" : typeFor(column.type_oid) + (column.not_null ? "" : " | null");
        lines.push(`          ${column.column_name}${optional ? "?" : ""}: ${value};`);
      }
      lines.push("        };");
    }
    lines.push("        Relationships: [");
    for (const relationship of relationships.filter((item) => item.table_name === table)) {
      lines.push(`          { foreignKeyName: ${JSON.stringify(relationship.name)}; columns: ${JSON.stringify(relationship.columns)}; isOneToOne: ${relationship.one_to_one}; referencedRelation: ${JSON.stringify(relationship.referenced_relation)}; referencedColumns: ${JSON.stringify(relationship.referenced_columns)}; },`);
    }
    lines.push("        ];", "      };");
  }
  lines.push("    };", "    Views: { [_ in never]: never };", "    Functions: {");
  for (const fn of functions) {
    lines.push(`      ${fn.proname}: { Args: ${fn.arg_types.length ? "{" : "Record<string, never>"}`);
    for (let i=0; i<fn.arg_types.length; i++) {
      lines.push(`        ${fn.proargnames[i]}${i >= fn.arg_types.length - fn.pronargdefaults ? "?" : ""}: ${typeFor(fn.arg_types[i])};`);
    }
    lines.push(`      ${fn.arg_types.length ? "}" : ""}; Returns: ${typeFor(fn.prorettype)}; };`);
  }
  lines.push("    };", "    Enums: {");
  for (const item of enums) lines.push(`      ${item.typname}: ${item.labels.map((label) => JSON.stringify(label)).join(" | ")};`);
  lines.push("    };", "    CompositeTypes: { [_ in never]: never };", "  };", "};", "",
    'export type TableName = keyof Database["public"]["Tables"];',
    'export type Tables<Name extends TableName> = Database["public"]["Tables"][Name]["Row"];',
    'export type TablesInsert<Name extends TableName> = Database["public"]["Tables"][Name]["Insert"];',
    'export type TablesUpdate<Name extends TableName> = Database["public"]["Tables"][Name]["Update"];',
    'export type Enums<Name extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][Name];', "");
  const generated = lines.join("\n");
  const target = new URL("../../src/lib/supabase/database.types.ts", import.meta.url);
  if (process.argv.includes("--check")) {
    if (await readFile(target,"utf8") !== generated) throw new Error("Tipos desatualizados. Execute npm run db:types e revise a alteração.");
    console.log("Tipos conferidos contra o schema migrado.");
  } else {
    await mkdir(new URL("../../src/lib/supabase/", import.meta.url), { recursive:true });
    await writeFile(target,generated,"utf8");
    console.log(`Tipos gerados por introspecção: ${new Set(columns.map((column) => column.table_name)).size} tabelas, ${functions.length} funções, ${enums.length} enums.`);
  }
} finally { await db.close(); }
