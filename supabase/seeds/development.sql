-- SOMENTE DESENVOLVIMENTO. Não é executado por db push nem automaticamente no reset.
do $$ begin
  if current_setting('ag.allow_development_seed',true) is distinct from 'yes-local-only' then
    raise exception 'Seed sintética desativada. Execute apenas em banco local descartável com opt-in explícito.';
  end if;
end $$;

-- Contas sem senha e sem capacidade de login. Claims são simulados somente nos testes SQL.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','owner-a@example.test',now(),'{"name":"Proprietário A [DEV]"}'),
 ('10000000-0000-4000-8000-000000000002','owner-b@example.test',now(),'{"name":"Proprietário B [DEV]"}'),
 ('10000000-0000-4000-8000-000000000003','member-a@example.test',now(),'{"name":"Membro A [DEV]"}'),
 ('10000000-0000-4000-8000-000000000004','admin-a@example.test',now(),'{"name":"Administrador A [DEV]"}'),
 ('10000000-0000-4000-8000-000000000005','invitee@example.test',now(),'{"name":"Convidado [DEV]"}'),
 ('10000000-0000-4000-8000-000000000006','unverified@example.test',null,'{"name":"Não confirmado [DEV]"}');

select private.ag_provision_workspace('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
insert into public.workspaces(id,name,slug) values('00000000-0000-4000-8000-000000000002','Workspace Sintético B [DEV]','workspace-sintetico-b-dev');
select private.ag_provision_workspace('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
insert into public.workspace_members(workspace_id,user_id,role,created_by) values
 ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','member','10000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','admin','10000000-0000-4000-8000-000000000001');

insert into public.leads(id,workspace_id,name,city,created_by) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Empresa Sintética A [DEV]','Cidade de Teste','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Empresa Sintética B [DEV]','Cidade de Teste','10000000-0000-4000-8000-000000000002');
insert into public.campaigns(id,workspace_id,name,created_by) values
 ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Campanha Sintética A [DEV]','10000000-0000-4000-8000-000000000001'),
 ('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Campanha Sintética B [DEV]','10000000-0000-4000-8000-000000000002');

-- Limites de teste, não representam plano contratado nem consumo real.
insert into public.usage_counters(workspace_id,resource,period_start,period_end,unit_limit)
select w.id,r.resource,date_trunc('month',now() at time zone 'UTC')::date,
 (date_trunc('month',now() at time zone 'UTC')+interval '1 month')::date,10
from public.workspaces w cross join unnest(enum_range(null::public.job_kind)) as r(resource);

-- Aprovações estritamente sintéticas para testar as barreiras de licença.
insert into public.data_usage_policies(id,workspace_id,source,purpose,version,persistence,allowed_fields,allows_ai,retention_days,rules_url,reviewed_at)
values
 ('40000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','first_party','ai_draft',1,'time_limited',array['output_text'],true,7,'https://example.test/politica-sintetica',now()),
 ('40000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','pagespeed','website_audit',1,'time_limited',array['performance_score','lcp_ms','cls','inp_ms'],false,7,'https://example.test/politica-sintetica',now());
