import assert from "node:assert/strict";
import { createTestDatabase, applyDevelopmentSeed } from "../../scripts/db/database.mjs";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const ownerA = "10000000-0000-4000-8000-000000000001";
const ownerB = "10000000-0000-4000-8000-000000000002";
const memberA = "10000000-0000-4000-8000-000000000003";
const adminA = "10000000-0000-4000-8000-000000000004";
const invitee = "10000000-0000-4000-8000-000000000005";
const unverified = "10000000-0000-4000-8000-000000000006";
const leadA = "20000000-0000-4000-8000-000000000001";
const leadB = "20000000-0000-4000-8000-000000000002";
const campaignA = "30000000-0000-4000-8000-000000000001";
const campaignB = "30000000-0000-4000-8000-000000000002";
const aiPolicy = "40000000-0000-4000-8000-000000000001";
const auditPolicy = "40000000-0000-4000-8000-000000000002";

const { db, migrations } = await createTestDatabase();
const filterIndex = process.argv.indexOf("--grep");
const filter = filterIndex === -1 ? null : new RegExp(process.argv[filterIndex + 1] || "(?!)", "u");
let passed = 0;
let skipped = 0;
let currentTest = "inicialização";
async function check(label, fn) {
  if (filter && !filter.test(label)) { skipped++; return; }
  currentTest = label;
  await fn(); passed++;
  console.log(`OK ${passed}: ${label}`);
}
async function as(user, fn, role="authenticated") {
  assert.ok(["authenticated","anon","service_role"].includes(role));
  await db.exec(`begin; set local role ${role};`);
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user ?? ""]);
    const result = await fn();
    await db.exec("set constraints all immediate; commit;");
    return result;
  } catch (error) { await db.exec("rollback;"); throw error; }
}
async function fails(fn, codes) {
  let caught = false;
  try { await fn(); } catch (error) { caught=true; assert.ok(codes.includes(error.code), `SQLSTATE inesperado: ${error.code}`); }
  assert.ok(caught,"Operação indevida foi aceita.");
}
async function scalar(sql,params=[]) { return Object.values((await db.query(sql,params)).rows[0])[0]; }

try {
  await check("migrações executadas e AG inicial sem proprietário/associação automática", async () => {
    assert.equal(migrations.length,10);
    assert.equal(await scalar("select state from public.workspaces where id=$1",[A]),"pending_owner");
    assert.equal(await scalar("select owner_id from public.workspaces where id=$1",[A]),null);
    assert.equal(await as(null,()=>scalar("select count(*)::integer from public.workspaces")),0);
  });
  await check("seed desativada sem opt-in", async () => {
    const { readFile } = await import("node:fs/promises");
    // Guard real é exercitado sem executar as inserções seguintes.
    const seed = await readFile(new URL("../seeds/development.sql",import.meta.url),"utf8");
    await fails(()=>db.exec(seed),["P0001"]);
  });
  await applyDevelopmentSeed(db);
  // POPULAÇÃO SINTÉTICA adicional para provar SELECT de cada tabela em ambos os escopos.
  for (const [ws,user,lead,campaign,suffix] of [[A,ownerA,leadA,campaignA,"1"],[B,ownerB,leadB,campaignB,"2"]]) {
    await db.query("insert into public.lead_notes(workspace_id,lead_id,body,created_by) values($1,$2,'Nota sintética',$3)",[ws,lead,user]);
    await db.query("insert into public.lead_activities(workspace_id,lead_id,kind,summary,created_by) values($1,$2,'follow_up','Atividade sintética',$3)",[ws,lead,user]);
    await db.query("insert into public.crm_tasks(workspace_id,lead_id,title,assigned_to,created_by) values($1,$2,'Tarefa sintética',$3,$3)",[ws,lead,user]);
    const template = await scalar("insert into public.message_templates(workspace_id,name,body,created_by) values($1,'Modelo sintético','Sem envio real',$2) returning id",[ws,user]);
    await db.query("insert into public.campaign_leads(workspace_id,campaign_id,lead_id,created_by) values($1,$2,$3,$4)",[ws,campaign,lead,user]);
    const search = await scalar("insert into public.search_history(workspace_id,mode,location_input,created_by) values($1,'free','Local sintético',$2) returning id",[ws,user]);
    await db.query("insert into public.async_jobs(workspace_id,kind,search_id,template_id,idempotency_key,created_by) values($1,'company_search',$2,$3,$4,$5)",[ws,search,template,`scope-test-${suffix}`,user]);
    const policy = await scalar("insert into public.data_usage_policies(workspace_id,source,purpose,version,persistence,allowed_fields,rules_url,reviewed_at) values($1,'first_party','prospecting',1,'identifier_only',array['external_id'],'https://example.test/own-source',now()) returning id",[ws]);
    await as(user,()=>db.query("insert into public.lead_external_references(workspace_id,lead_id,provider,external_id,policy_id) values($1,$2,'first_party',$3,$4)",[ws,lead,`SYNTHETIC_REFERENCE_${suffix}`,policy]));
    await as(user,()=>scalar("select public.ag_reserve_usage($1,'company_search',1,$2)",[ws,`scope-reservation-${suffix}`]));
    await as(user,()=>scalar("select public.ag_create_invitation($1,$2,'member')",[ws,`scope-${suffix}@example.test`]));
    let ai = aiPolicy; let audit = auditPolicy;
    if (ws===B) {
      ai=await scalar("insert into public.data_usage_policies(workspace_id,source,purpose,version,persistence,allowed_fields,allows_ai,retention_days,rules_url,reviewed_at) values($1,'first_party','ai_draft',1,'time_limited',array['output_text'],true,7,'https://example.test/synthetic',now()) returning id",[ws]);
      audit=await scalar("insert into public.data_usage_policies(workspace_id,source,purpose,version,persistence,allowed_fields,retention_days,rules_url,reviewed_at) values($1,'pagespeed','website_audit',1,'time_limited',array['performance_score'],7,'https://example.test/synthetic',now()) returning id",[ws]);
    }
    await db.query("insert into public.ai_generations(workspace_id,lead_id,policy_id,source,model,request_digest,retention_until,created_by) values($1,$2,$3,'first_party','synthetic-test-model',$4,now()+interval '1 day',$5)",[ws,lead,ai,"a".repeat(64),user]);
    await db.query("insert into public.website_audits(workspace_id,lead_id,policy_id,target_url,strategy,retention_until,created_by) values($1,$2,$3,'https://example.test','mobile',now()+interval '1 day',$4)",[ws,lead,audit,user]);
  }

  await check("RLS habilitado nas 22 tabelas públicas, sem SECURITY DEFINER exposto", async () => {
    assert.equal(await scalar("select count(*)::integer from pg_tables where schemaname='public'"),22);
    assert.equal(await scalar("select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity"),0);
    assert.equal(await scalar("select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef"),0);
  });
  await check("funções privilegiadas têm search_path fixo e não executam como PUBLIC/anon", async () => {
    const functions=(await db.query("select p.oid,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.prosecdef")).rows;
    assert.ok(functions.length>0);
    for (const fn of functions) {
      assert.ok(fn.proconfig.some((value)=>/^search_path=(?:""|)$/.test(value)));
      assert.equal(await scalar("select has_function_privilege('anon',$1::oid,'execute')",[fn.oid]),false);
    }
  });
  const tenantTables=(await db.query("select c.table_name from information_schema.columns c where c.table_schema='public' and c.column_name='workspace_id' order by c.table_name")).rows.map((row)=>row.table_name);
  for (const [user,own,other,label] of [[ownerA,A,B,"A"],[ownerB,B,A,"B"]]) {
    for (const table of tenantTables) await check(`SELECT ${table}: usuário ${label} isolado do outro workspace`,async()=>{
      assert.ok(await as(user,()=>scalar(`select count(*)::integer from public.${table} where workspace_id=$1`,[own]))>0);
      assert.equal(await as(user,()=>scalar(`select count(*)::integer from public.${table} where workspace_id=$1`,[other])),0);
    });
  }
  await check("workspaces e perfis também respeitam escopo e compartilhamento",async()=>{
    assert.equal(await as(ownerA,()=>scalar("select count(*)::integer from public.workspaces where id=$1",[B])),0);
    assert.equal(await as(ownerA,()=>scalar("select count(*)::integer from public.profiles where id=$1",[ownerB])),0);
    assert.equal(await as(memberA,()=>scalar("select count(*)::integer from public.profiles where id=$1",[ownerA])),1);
  });
  await check("anon não lê dados, nem executa RPC de reserva",async()=>{
    await fails(()=>as(null,()=>db.query("select * from public.leads"),"anon"),["42501"]);
    await fails(()=>as(null,()=>db.query("select public.ag_reserve_usage($1,'company_search',1,'anonymous-key')",[A]),"anon"),["42501"]);
  });
  await check("INSERT fora do workspace é negado",()=>fails(()=>as(ownerA,()=>db.query("insert into public.leads(workspace_id,name) values($1,'Forbidden')",[B])),["42501"]));
  await check("UPDATE/DELETE invisíveis não afetam dados de outro workspace",async()=>{
    assert.equal((await as(ownerA,()=>db.query("update public.leads set name='Forbidden' where id=$1 returning id",[leadB]))).rows.length,0);
    assert.equal((await as(ownerA,()=>db.query("delete from public.leads where id=$1 returning id",[leadB]))).rows.length,0);
    assert.equal(await as(ownerB,()=>scalar("select name from public.leads where id=$1",[leadB])),"Empresa Sintética B [DEV]");
  });
  await check("membro cria e edita lead permitido, autoria e proveniência são geradas",async()=>{
    const id=await as(memberA,()=>scalar("insert into public.leads(workspace_id,name) values($1,'Registro próprio') returning id",[A]));
    assert.equal(await scalar("select created_by from public.leads where id=$1",[id]),memberA);
    await as(memberA,()=>db.query("update public.leads set name='Registro editado' where id=$1",[id]));
    assert.equal(await scalar("select count(*)::integer from public.crm_field_provenance where lead_id=$1 and field_name='name' and recorded_by=$2 and recorded_via='authenticated_user'",[id,memberA]),2);
    assert.equal((await as(memberA,()=>db.query("delete from public.leads where id=$1 returning id",[id]))).rows.length,0);
    await as(ownerA,()=>db.query("delete from public.leads where id=$1",[id]));
  });
  await check("workspace_id, autor e datas de criação são protegidos por grants e trigger",async()=>{
    await fails(()=>as(ownerA,()=>db.query("update public.leads set workspace_id=$1 where id=$2",[B,leadA])),["42501"]);
    await fails(()=>as(ownerA,()=>db.query("insert into public.leads(workspace_id,name,created_by) values($1,'Spoof',$2)",[A,ownerB])),["42501"]);
    await fails(()=>as(null,()=>db.query("update public.leads set workspace_id=$1 where id=$2",[B,leadA]),"service_role"),["42501"]);
  });
  await check("FK composta impede nota, campanha e responsável de outro workspace",async()=>{
    await fails(()=>as(ownerA,()=>db.query("insert into public.lead_notes(workspace_id,lead_id,body) values($1,$2,'Cross')",[A,leadB])),["23503"]);
    await fails(()=>as(ownerA,()=>db.query("insert into public.campaign_leads(workspace_id,campaign_id,lead_id) values($1,$2,$3)",[A,campaignA,leadB])),["23503"]);
    await fails(()=>as(ownerA,()=>db.query("insert into public.campaign_leads(workspace_id,campaign_id,lead_id) values($1,$2,$3)",[A,campaignB,leadA])),["23503"]);
    await fails(()=>as(ownerA,()=>db.query("update public.leads set assigned_to=$1 where id=$2",[ownerB,leadA])),["23503"]);
  });
  await check("membro não gerencia campanhas nem anotações alheias",async()=>{
    await fails(()=>as(memberA,()=>db.query("insert into public.campaigns(workspace_id,name) values($1,'Forbidden')",[A])),["42501"]);
    const note=await scalar("select id from public.lead_notes where workspace_id=$1 limit 1",[A]);
    assert.equal((await as(memberA,()=>db.query("update public.lead_notes set body='Forbidden' where id=$1 returning id",[note]))).rows.length,0);
    await as(adminA,()=>db.query("update public.lead_notes set body='Nota revisada pelo admin' where id=$1",[note]));
  });
  await check("mudança de etapa e updated_at são automáticos; histórico não é editável",async()=>{
    await as(memberA,()=>db.query("update public.leads set stage='qualified' where id=$1",[leadA]));
    assert.equal(await scalar("select count(*)::integer from public.lead_stage_history where lead_id=$1 and from_stage='new' and to_stage='qualified' and changed_by=$2",[leadA,memberA]),1);
    assert.ok(await scalar("select updated_at>created_at from public.leads where id=$1",[leadA]));
    await fails(()=>as(ownerA,()=>db.query("delete from public.lead_stage_history where lead_id=$1",[leadA])),["42501"]);
  });
  await check("membro não se promove; admin não promove; proprietário usa RPC controlado",async()=>{
    await fails(()=>as(memberA,()=>db.query("update public.workspace_members set role='owner' where workspace_id=$1 and user_id=$2",[A,memberA])),["42501"]);
    await fails(()=>as(adminA,()=>db.query("select public.ag_change_member_role($1,$2,'admin')",[A,memberA])),["42501"]);
    await fails(()=>as(ownerB,()=>db.query("select public.ag_change_member_role($1,$2,'admin')",[A,memberA])),["42501"]);
    await as(ownerA,()=>db.query("select public.ag_change_member_role($1,$2,'admin')",[A,memberA]));
    await as(ownerA,()=>db.query("select public.ag_change_member_role($1,$2,'member')",[A,memberA]));
    await fails(()=>as(ownerA,()=>db.query("select public.ag_change_member_role($1,$2,'owner')",[A,memberA])),["42501"]);
  });
  await check("papel informado no JWT/metadata não concede privilégios",async()=>{
    await as(memberA,async()=>{
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:memberA,workspace_role:"owner"})]);
      assert.equal(await scalar("select private.ag_has_role($1,array['owner']::public.workspace_role[])",[A]),false);
    });
  });
  await check("criação de workspace exige aprovação, sem auto-claim da AG",async()=>{
    await fails(()=>as(ownerA,()=>db.query("select public.ag_create_workspace('Não autorizado','nao-autorizado')")),["42501"]);
    await fails(()=>as(ownerA,()=>db.query("select private.ag_provision_workspace($1,$2)",[A,ownerA])),["42501"]);
    await as(null,()=>db.query("select private.ag_allow_workspace_creation($1,true)",[ownerA]),"service_role");
    const id=await as(ownerA,()=>scalar("select public.ag_create_workspace('Workspace autorizado de teste','autorizado-teste')"));
    assert.equal(await as(ownerA,()=>scalar("select owner_id from public.workspaces where id=$1",[id])),ownerA);
    await as(null,()=>db.query("select private.ag_allow_workspace_creation($1,false)",[ownerA]),"service_role");
  });
  await check("convites: papéis, e-mail confirmado, segredo privado e aceite único",async()=>{
    await fails(()=>as(memberA,()=>db.query("select public.ag_create_invitation($1,'nobody@example.test','member')",[A])),["42501"]);
    await fails(()=>as(adminA,()=>db.query("select public.ag_create_invitation($1,'nobody@example.test','admin')",[A])),["42501"]);
    await fails(()=>as(ownerA,()=>db.query("select public.ag_create_invitation($1,'nobody@example.test','owner')",[A])),["42501"]);
    const token=await as(ownerA,()=>scalar("select public.ag_create_invitation($1,'invitee@example.test','member')",[A]));
    assert.ok(typeof token==='string' && token.length===64);
    await fails(()=>as(ownerA,()=>db.query("select * from private.invitation_tokens")),["42501"]);
    await fails(()=>as(ownerB,()=>db.query("select public.ag_accept_invitation($1)",[token])),["42501"]);
    assert.equal(await as(invitee,()=>scalar("select public.ag_accept_invitation($1)",[token])),A);
    await fails(()=>as(invitee,()=>db.query("select public.ag_accept_invitation($1)",[token])),["42501"]);
    const other=await as(ownerA,()=>scalar("select public.ag_create_invitation($1,'unverified@example.test','member')",[A]));
    await fails(()=>as(unverified,()=>db.query("select public.ag_accept_invitation($1)",[other])),["42501"]);
  });
  await check("remoção de associação revoga acesso imediatamente; proprietário não sai",async()=>{
    await fails(()=>as(ownerA,()=>db.query("select public.ag_remove_member($1,$2)",[A,ownerA])),["42501"]);
    await as(ownerA,()=>db.query("select public.ag_remove_member($1,$2)",[A,invitee]));
    assert.equal(await as(invitee,()=>scalar("select count(*)::integer from public.leads where workspace_id=$1",[A])),0);
  });
  await check("convite expirado ou revogado não pode ser aceito",async()=>{
    const token=await as(ownerA,()=>scalar("select public.ag_create_invitation($1,'revoked@example.test','member')",[A]));
    const id=await scalar("select id from public.workspace_invitations where workspace_id=$1 and email='revoked@example.test'",[A]);
    await as(ownerA,()=>db.query("select public.ag_revoke_invitation($1,$2)",[A,id]));
    await fails(()=>as(invitee,()=>db.query("select public.ag_accept_invitation($1)",[token])),["42501"]);
    const expired=await scalar("insert into public.workspace_invitations(workspace_id,email,role,created_by,created_at,expires_at) values($1,'invitee@example.test','member',$2,now()-interval '4 days',now()-interval '1 day') returning id",[A,ownerA]);
    const syntheticToken="d".repeat(64);
    await db.query("insert into private.invitation_tokens(invitation_id,token_hash) values($1,encode(sha256(convert_to($2,'UTF8')),'hex'))",[expired,syntheticToken]);
    await fails(()=>as(invitee,()=>db.query("select public.ag_accept_invitation($1)",[syntheticToken])),["42501"]);
  });
  await check("transferência de proprietário atômica mantém exatamente um owner",async()=>{
    await fails(()=>as(ownerA,()=>db.query("select public.ag_transfer_ownership($1,$2)",[A,ownerB])),["22023"]);
    await as(ownerA,()=>db.query("select public.ag_transfer_ownership($1,$2)",[A,adminA]));
    assert.equal(await scalar("select owner_id from public.workspaces where id=$1",[A]),adminA);
    assert.equal(await scalar("select count(*)::integer from public.workspace_members where workspace_id=$1 and role='owner'",[A]),1);
    await as(adminA,()=>db.query("select public.ag_transfer_ownership($1,$2)",[A,ownerA]));
  });
  await check("proprietário não pode ser substituído arbitrariamente ou duplicado",async()=>{
    await fails(()=>as(null,()=>db.query("update public.workspaces set owner_id=$1 where id=$2",[memberA,A]),"service_role"),["23514"]);
    await fails(()=>as(null,()=>db.query("update public.workspace_members set role='owner' where workspace_id=$1 and user_id=$2",[A,memberA]),"service_role"),["23505"]);
    await fails(()=>as(ownerA,()=>db.query("update public.workspaces set owner_id=$1 where id=$2",[memberA,A])),["42501"]);
  });
  await check("referência própria deduplicada por workspace, sem payload externo",async()=>{
    const policy=await scalar("select id from public.data_usage_policies where workspace_id=$1 and source='first_party' and purpose='prospecting'",[A]);
    const id=await as(ownerA,()=>scalar("insert into public.leads(workspace_id,name) values($1,'Outra empresa própria') returning id",[A]));
    await fails(()=>as(ownerA,()=>db.query("insert into public.lead_external_references(workspace_id,lead_id,provider,external_id,policy_id) values($1,$2,'first_party','SYNTHETIC_REFERENCE_1',$3)",[A,id,policy])),["23505"]);
    const policyB=await scalar("select id from public.data_usage_policies where workspace_id=$1 and source='first_party' and purpose='prospecting'",[B]);
    await as(ownerB,()=>db.query("delete from public.lead_external_references where workspace_id=$1",[B]));
    await as(ownerB,()=>db.query("insert into public.lead_external_references(workspace_id,lead_id,provider,external_id,policy_id) values($1,$2,'first_party','SYNTHETIC_REFERENCE_1',$3)",[B,leadB,policyB]));
  });
  await check("Google ID não aprova o produto e não pode ser liberado por DML de política",async()=>{
    const policy=await scalar("select id from public.data_usage_policies where workspace_id=$1 and source='google_places'",[A]);
    assert.equal(await scalar("select persistence from public.data_usage_policies where id=$1",[policy]),'blocked');
    await fails(()=>as(ownerA,()=>db.query("insert into public.lead_external_references(workspace_id,lead_id,provider,external_id,policy_id) values($1,$2,'google_places','SYNTHETIC_GOOGLE_BLOCKED',$3)",[A,leadA,policy])),['23514','42501']);
    await fails(()=>db.query("update public.data_usage_policies set persistence='identifier_only',allowed_fields=array['place_id'] where id=$1",[policy]),['23514']);
  });
  await check("migração preserva identificador legado sem expor ou autorizar novas referências Google",async()=>{
    const old=await createTestDatabase({throughMigration:'20261027000500_verified_email_invitations.sql'});
    try {
      await applyDevelopmentSeed(old.db);
      await old.db.query("insert into public.lead_external_references(workspace_id,lead_id,provider,external_id,policy_id,created_by) select $1,$2,'google_places','LEGACY_SYNTHETIC_ID',id,$3 from public.data_usage_policies where workspace_id=$1 and source='google_places'",[A,leadA,ownerA]);
      await old.db.query("update public.data_usage_policies set reviewed_at=now()-interval '10 days',valid_until=now()-interval '1 day' where source='google_places'");
      const {readFile}=await import('node:fs/promises');
      await old.db.exec(await readFile(new URL('../migrations/20261027000600_google_product_use_gate.sql',import.meta.url),'utf8'));
      assert.equal((await old.db.query("select count(*)::integer as count from public.lead_external_references where provider='google_places'")).rows[0].count,1);
      await old.db.exec('begin; set local role authenticated;');
      await old.db.query("select set_config('request.jwt.claim.sub',$1,true)",[ownerA]);
      assert.equal((await old.db.query("select count(*)::integer as count from public.lead_external_references where provider='google_places'")).rows[0].count,0);
      await old.db.exec('rollback;');
    } finally {await old.db.close();}
  });
  await check("Google não pode virar licença de armazenamento/IA e usuário não aprova política",async()=>{
    await fails(()=>as(ownerA,()=>db.query("update public.data_usage_policies set allows_ai=true where workspace_id=$1",[A])),["42501"]);
    await fails(()=>db.query("update public.data_usage_policies set allows_ai=true,persistence='time_limited',retention_days=1 where workspace_id=$1 and source='google_places'",[A]),["23514"]);
    const googlePolicy=await scalar("select id from public.data_usage_policies where workspace_id=$1 and source='google_places'",[A]);
    await fails(()=>db.query("insert into public.ai_generations(workspace_id,lead_id,policy_id,source,model,request_digest,retention_until,created_by) values($1,$2,$3,'first_party','synthetic',$4,now()+interval '1 day',$5)",[A,leadA,googlePolicy,"b".repeat(64),ownerA]),["23514"]);
    await fails(()=>as(ownerA,()=>db.query("insert into public.website_audits(workspace_id,lead_id,policy_id,target_url,strategy,retention_until) values($1,$2,$3,'https://example.test','mobile',now()+interval '1 day')",[A,leadA,auditPolicy])),["42501"]);
  });
  await check("artefatos recusam prazo excessivo e somem após revogação da política",async()=>{
    await fails(()=>db.query("insert into public.ai_generations(workspace_id,lead_id,policy_id,source,model,request_digest,retention_until,created_by) values($1,$2,$3,'first_party','synthetic',$4,now()+interval '30 days',$5)",[A,leadA,aiPolicy,"c".repeat(64),ownerA]),["23514"]);
    await db.query("update public.data_usage_policies set allows_ai=false where id=$1",[aiPolicy]);
    assert.equal(await as(ownerA,()=>scalar("select count(*)::integer from public.ai_generations where workspace_id=$1",[A])),0);
    await as(null,()=>db.query("select private.ag_purge_expired_data(100)"),"service_role");
    assert.equal(await scalar("select count(*)::integer from public.ai_generations where workspace_id=$1",[A]),0);
  });
  await check("consumo: reserva idempotente, limite, isolamento e liquidação confiável",async()=>{
    const reservation=await as(ownerA,()=>scalar("select public.ag_reserve_usage($1,'ai_generation',7,'quota-test-0001')",[A]));
    assert.equal(await as(ownerA,()=>scalar("select public.ag_reserve_usage($1,'ai_generation',7,'quota-test-0001')",[A])),reservation);
    assert.equal(await scalar("select reserved_units from public.usage_counters where workspace_id=$1 and resource='ai_generation'",[A]),7);
    await fails(()=>as(ownerA,()=>db.query("select public.ag_reserve_usage($1,'ai_generation',8,'quota-test-0001')",[A])),["22023"]);
    await fails(()=>as(ownerA,()=>db.query("select public.ag_reserve_usage($1,'ai_generation',4,'quota-test-0002')",[A])),["P0001"]);
    await fails(()=>as(ownerB,()=>db.query("select public.ag_reserve_usage($1,'ai_generation',1,'quota-cross-0001')",[A])),["42501"]);
    await fails(()=>as(ownerA,()=>db.query("select public.ag_settle_usage($1,'committed',5)",[reservation])),["42501"]);
    await fails(()=>as(ownerA,()=>db.query("update public.usage_counters set unit_limit=999999 where workspace_id=$1",[A])),["42501"]);
    await as(null,()=>db.query("select public.ag_settle_usage($1,'committed',5)",[reservation]),"service_role");
    await as(null,()=>db.query("select public.ag_settle_usage($1,'committed',5)",[reservation]),"service_role");
    assert.equal(await scalar("select reserved_units from public.usage_counters where workspace_id=$1 and resource='ai_generation'",[A]),0);
    assert.equal(await scalar("select used_units from public.usage_counters where workspace_id=$1 and resource='ai_generation'",[A]),5);
    await fails(()=>as(null,()=>db.query("select public.ag_settle_usage($1,'committed',6)",[reservation]),"service_role"),["22023"]);
  });
  await check("reservas expiradas são liberadas sem inventar consumo",async()=>{
    const counter=await scalar("select id from public.usage_counters where workspace_id=$1 and resource='ai_generation'",[A]);
    await db.query("update public.usage_counters set reserved_units=1 where id=$1",[counter]);
    const reservation=await scalar("insert into public.usage_reservations(workspace_id,counter_id,resource,idempotency_key,units,created_by,created_at,expires_at) values($1,$2,'ai_generation','expired-test-0001',1,$3,now()-interval '20 minutes',now()-interval '5 minutes') returning id",[A,counter,ownerA]);
    await fails(()=>as(null,()=>db.query("select public.ag_settle_usage($1,'committed',1)",[reservation]),"service_role"),["22023"]);
    await as(null,()=>db.query("select private.ag_purge_expired_data(100)"),"service_role");
    assert.equal(await scalar("select state from public.usage_reservations where id=$1",[reservation]),"expired");
    assert.equal(await scalar("select reserved_units from public.usage_counters where id=$1",[counter]),0);
    assert.equal(await scalar("select used_units from public.usage_counters where id=$1",[counter]),5);
  });
  await check("buscas expiradas são eliminadas e jobs associados são cancelados",async()=>{
    const search=await scalar("insert into public.search_history(workspace_id,mode,location_input,created_by,created_at,retention_until) values($1,'free','Parâmetro sintético expirado',$2,now()-interval '31 days',now()-interval '1 day') returning id",[A,ownerA]);
    const job=await scalar("insert into public.async_jobs(workspace_id,kind,search_id,idempotency_key,created_by) values($1,'company_search',$2,'expired-search-job',$3) returning id",[A,search,ownerA]);
    assert.equal(await as(ownerA,()=>scalar("select count(*)::integer from public.search_history where id=$1",[search])),0);
    await as(null,()=>db.query("select private.ag_purge_expired_data(100)"),"service_role");
    assert.equal(await scalar("select count(*)::integer from public.search_history where id=$1",[search]),0);
    assert.equal(await scalar("select state from public.async_jobs where id=$1",[job]),"cancelled");
    assert.equal(await scalar("select search_id from public.async_jobs where id=$1",[job]),null);
  });
  await check("convites por identidade: somente o e-mail confirmado vê seus convites",async()=>{
    const recipient='10000000-0000-4000-8000-000000000007';
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'identity-invite@example.test',now())",[recipient]);
    await as(ownerA,()=>db.query("select public.ag_create_invitation($1,'identity-invite@example.test','member')",[A]));
    const invitations=await as(recipient,()=>scalar("select public.ag_list_my_invitations()"));
    assert.equal(invitations.length,1);
    assert.equal(invitations[0].workspace_id,A);
    assert.equal(await as(ownerB,()=>scalar("select jsonb_array_length(public.ag_list_my_invitations())")),0);
    assert.equal(await as(unverified,()=>scalar("select jsonb_array_length(public.ag_list_my_invitations())")),0);
    await fails(()=>as(null,()=>db.query("select public.ag_list_my_invitations()"),'anon'),['42501']);
  });
  await check("aceite por identidade recusa outro destinatário e e-mail não confirmado",async()=>{
    const id=await scalar("select id from public.workspace_invitations where email='identity-invite@example.test'");
    await fails(()=>as(ownerB,()=>db.query("select public.ag_accept_invitation_by_id($1)",[id])),['42501']);
    const unverifiedInvite=await scalar("select id from public.workspace_invitations where email='unverified@example.test' limit 1");
    await fails(()=>as(unverified,()=>db.query("select public.ag_accept_invitation_by_id($1)",[unverifiedInvite])),['42501']);
  });
  await check("aceite por identidade é único, consome o hash e não promove membro",async()=>{
    const recipient='10000000-0000-4000-8000-000000000007';
    const id=await scalar("select id from public.workspace_invitations where email='identity-invite@example.test'");
    assert.equal(await as(recipient,()=>scalar("select public.ag_accept_invitation_by_id($1)",[id])),A);
    await fails(()=>as(recipient,()=>db.query("select public.ag_accept_invitation_by_id($1)",[id])),['42501']);
    assert.equal(await scalar("select count(*)::integer from private.invitation_tokens where invitation_id=$1",[id]),0);
    await as(ownerA,()=>db.query("select public.ag_create_invitation($1,'identity-invite@example.test','admin')",[A]));
    const promotion=await scalar("select id from public.workspace_invitations where email='identity-invite@example.test' and accepted_at is null");
    await fails(()=>as(recipient,()=>db.query("select public.ag_accept_invitation_by_id($1)",[promotion])),['22023']);
    assert.equal(await scalar("select role from public.workspace_members where user_id=$1 and workspace_id=$2",[recipient,A]),'member');
  });
  await check("aceite por identidade recusa convite expirado ou revogado",async()=>{
    const recipient='10000000-0000-4000-8000-000000000007';
    const id=await scalar("select id from public.workspace_invitations where email='identity-invite@example.test' and accepted_at is null");
    await as(ownerA,()=>db.query("select public.ag_revoke_invitation($1,$2)",[A,id]));
    await fails(()=>as(recipient,()=>db.query("select public.ag_accept_invitation_by_id($1)",[id])),['42501']);
    const expired=await scalar("select id from public.workspace_invitations where email='invitee@example.test' and expires_at<now() limit 1");
    await fails(()=>as(invitee,()=>db.query("select public.ag_accept_invitation_by_id($1)",[expired])),['42501']);
    assert.equal(await as(recipient,()=>scalar("select jsonb_array_length(public.ag_list_my_invitations())")),0);
  });
  await check("auditoria administrativa existe, sem campos de token/conteúdo e sem adulteração",async()=>{
    assert.ok(await as(ownerA,()=>scalar("select count(*)::integer from public.admin_audit_events where workspace_id=$1",[A]))>0);
    assert.equal(await as(memberA,()=>scalar("select count(*)::integer from public.admin_audit_events")),0);
    await fails(()=>as(ownerA,()=>db.query("delete from public.admin_audit_events where workspace_id=$1",[A])),["42501"]);
    await fails(()=>as(null,()=>db.query("delete from public.admin_audit_events where workspace_id=$1",[A]),"service_role"),["42501"]);
    await fails(()=>as(ownerA,()=>db.query("select private.ag_emit_audit($1,'delete','leads',$2,array['name'])",[A,leadA])),["42501"]);
    assert.equal(await scalar("select count(*)::integer from information_schema.columns where table_schema='public' and table_name='admin_audit_events' and column_name in ('payload','token','body','prompt')"),0);
  });
  assert.ok(passed > 0, "Nenhuma verificação corresponde ao filtro solicitado.");
  console.log(JSON.stringify({passed, skipped, migrations:migrations.length, engine:(await db.query("select version() as version")).rows[0].version, fullSupabaseStack:false, concurrentConnections:false}));
} catch (error) {
  console.error(`FALHOU: ${currentTest}: ${error.message} [${error.code ?? 'assertion'}]`);
  process.exitCode=1;
} finally { await db.close(); }

// Sem acesso remoto, chaves reais, API do Auth ou efeitos na interface.
