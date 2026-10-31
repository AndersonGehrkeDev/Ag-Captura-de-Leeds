begin;
alter type public.lead_stage add value 'analysis' after 'new';
alter type public.lead_stage add value 'negotiation' after 'proposal';
alter table public.leads
  add column crm_mode text not null default 'legacy' check(crm_mode in ('legacy','manual','catalog')),
  add column tags text[] not null default '{}' check(cardinality(tags)<=12 and array_position(tags,null) is null and length(array_to_string(tags,''))<=360),
  add column do_not_contact boolean not null default false,
  add column next_contact_at timestamptz,
  add column manual_key text generated always as (case when crm_mode='manual' then translate(lower(regexp_replace(btrim(name),'\s+',' ','g')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc') end) stored;
create unique index crm_manual_workspace_identity on public.leads(workspace_id,manual_key) where manual_key is not null;
alter table public.leads add constraint crm_do_not_contact_schedule check(not do_not_contact or next_contact_at is null);
alter table public.lead_external_references add column managed_by_crm boolean not null default false;
alter policy scope_read on public.lead_external_references using(private.ag_has_role(workspace_id) and provider<>'google_places' and not managed_by_crm);
alter table public.lead_notes add column crm_authored boolean not null default false;
create table private.crm_executor_config(singleton boolean primary key default true check(singleton), secret_sha256 text not null check(secret_sha256 ~ '^[a-f0-9]{64}$'));
create table private.crm_source_bindings (
  reference_id uuid primary key,
  workspace_id uuid not null, lead_id uuid not null, source_id uuid not null, native_reference text not null check(length(native_reference) between 1 and 512),
  provenance_id uuid not null, lineage_ids uuid[] not null check(cardinality(lineage_ids) between 1 and 128), expires_at timestamptz not null,
  unique(workspace_id,source_id,native_reference), unique(workspace_id,lead_id), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
  foreign key(workspace_id,lead_id,reference_id) references public.lead_external_references(workspace_id,lead_id,id) on delete cascade
);
create index crm_bindings_expiry on private.crm_source_bindings(expires_at,workspace_id);
alter table private.crm_executor_config enable row level security;
alter table private.crm_source_bindings enable row level security;
revoke all on private.crm_executor_config,private.crm_source_bindings from public,anon,authenticated,service_role;

-- Operador pode chamar no agendamento de retenção já adotado, sem expor Data API.
create function private.ag_crm_purge_expired(p_batch integer default 100,p_workspace uuid default null) returns integer
language plpgsql security definer set search_path='' as $$
declare total integer;
begin
  if p_batch is null or p_batch not between 1 and 500 then raise exception using errcode='22023',message='Lote inválido.'; end if;
  delete from public.lead_external_references r where r.id in (
    select s.reference_id from private.crm_source_bindings s join public.lead_external_references x on x.id=s.reference_id join public.data_usage_policies p on p.id=x.policy_id and p.workspace_id=x.workspace_id
    where (p_workspace is null or s.workspace_id=p_workspace) and (s.expires_at<=now() or p.persistence<>'identifier_only' or p.reviewed_at>now() or (p.valid_until is not null and p.valid_until<=now())) order by s.expires_at limit p_batch
  );
  get diagnostics total=row_count; return total;
end $$;
revoke all on function private.ag_crm_purge_expired(integer,uuid) from public,anon,authenticated,service_role;

create function private.ag_crm(p_workspace uuid,p_action text,p_input jsonb default '{}',p_executor text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.leads%rowtype; b private.crm_source_bindings%rowtype; pol public.data_usage_policies%rowtype;
  result jsonb; items jsonb; note_id uuid; ref_id uuid; source_uuid uuid; native_ref text; expiry timestamptz;
  duplicate boolean:=false; skip integer; assignee uuid; next_at timestamptz; tag_values text[]; label_value text;
begin
  if auth.uid() is null or not private.ag_has_role(p_workspace) then raise exception using errcode='42501',message='CRM não autorizado.'; end if;
  if p_executor is null or length(p_executor)<>64 or not exists(select 1 from private.crm_executor_config where singleton and secret_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_executor,'UTF8')),'hex')) then
    raise exception using errcode='42501',message='Executor indisponível.';
  end if;
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>16384 or p_action is null or p_action not in ('list','details','manual','import','update','note','export') then raise exception using errcode='22023',message='Operação inválida.'; end if;
  -- Retenção dos identificadores licenciados: limpa somente referências vencidas deste workspace.
  perform private.ag_crm_purge_expired(100,p_workspace);
  if p_action in ('manual','update') then
    if p_input->>'stage' is null or p_input->>'stage' not in ('new','analysis','contacted','qualified','proposal','negotiation','won','lost') or jsonb_typeof(p_input->'doNotContact') is distinct from 'boolean' or jsonb_typeof(p_input->'tags') is distinct from 'array' or jsonb_array_length(p_input->'tags')>12 then raise exception using errcode='22023',message='Campos inválidos.'; end if;
    if exists(select 1 from jsonb_array_elements(p_input->'tags') t where jsonb_typeof(t)<>'string' or length(btrim(t#>>'{}')) not between 1 and 30) then raise exception using errcode='22023',message='Etiquetas inválidas.'; end if;
    select coalesce(array_agg(distinct btrim(t)),'{}'::text[]) into tag_values from jsonb_array_elements_text(p_input->'tags') t;
    assignee:=(p_input->>'assignedTo')::uuid; next_at:=(p_input->>'nextContactAt')::timestamptz;
    if assignee is not null and not exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=assignee) then raise exception using errcode='42501',message='Responsável não autorizado.'; end if;
    if (p_input->>'doNotContact')::boolean then next_at:=null; end if;
  end if;
  if p_action='manual' then
    label_value:=btrim(p_input->>'label');
    if label_value is null or length(label_value) not between 1 and 200 or label_value ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='Identificação inválida.'; end if;
    -- Identificação interna, não é nome empresarial verificado nem comprovação de direitos.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace::text || ':crm-manual',0));
    select * into l from public.leads where workspace_id=p_workspace and manual_key=translate(lower(regexp_replace(label_value,'\s+',' ','g')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc');
    if found then duplicate:=true;
    else insert into public.leads(workspace_id,name,crm_mode,stage,assigned_to,tags,do_not_contact,next_contact_at)
      values(p_workspace,label_value,'manual',(p_input->>'stage')::public.lead_stage,assignee,tag_values,(p_input->>'doNotContact')::boolean,next_at) returning * into l;
    end if;
    return jsonb_build_object('leadId',l.id,'duplicate',duplicate);
  elsif p_action='import' then
    source_uuid:=(p_input->>'sourceId')::uuid; native_ref:=p_input->>'reference'; expiry:=(p_input->>'expiresAt')::timestamptz;
    if source_uuid is null or native_ref is null or length(native_ref) not between 1 and 512 or expiry is null or expiry<=now() or expiry>now()+interval '3650 days' or jsonb_typeof(p_input->'lineageIds') is distinct from 'array' or jsonb_array_length(p_input->'lineageIds') not between 1 and 128 or (p_input->>'provider') not in ('first_party','authorized_import') then raise exception using errcode='22023',message='Referência inválida.'; end if;
    select * into pol from public.data_usage_policies where workspace_id=p_workspace and id=(p_input->>'policyId')::uuid;
    if not found or pol.source::text is distinct from p_input->>'provider' or pol.purpose<>'prospecting' or pol.persistence<>'identifier_only' or not ('external_id'=any(pol.allowed_fields)) or pol.reviewed_by is null or pol.reviewed_at>now() or (pol.valid_until is not null and (pol.valid_until<=now() or expiry>pol.valid_until)) then raise exception using errcode='42501',message='Política não autoriza referência.'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace::text || ':crm-source',0));
    select * into b from private.crm_source_bindings where workspace_id=p_workspace and source_id=source_uuid and native_reference=native_ref;
    if (p_input->>'observedAt')::timestamptz is null or (p_input->>'observedAt')::timestamptz>now() or (p_input->>'observedAt')::timestamptz>=expiry then raise exception using errcode='22023',message='Observação inválida.'; end if;
    if found then
      update public.lead_external_references set policy_id=pol.id,provider=(p_input->>'provider')::public.data_source,observed_at=(p_input->>'observedAt')::timestamptz where id=b.reference_id;
      update private.crm_source_bindings set provenance_id=(p_input->>'provenanceId')::uuid,lineage_ids=array(select value::uuid from jsonb_array_elements_text(p_input->'lineageIds')),expires_at=expiry where reference_id=b.reference_id;
      return jsonb_build_object('leadId',b.lead_id,'duplicate',true);
    end if;
    insert into public.leads(workspace_id,name,crm_mode) values(p_workspace,'Lead ' || left(gen_random_uuid()::text,8),'catalog') returning * into l;
    insert into public.lead_external_references(workspace_id,lead_id,provider,external_id,policy_id,managed_by_crm,observed_at)
      values(p_workspace,l.id,(p_input->>'provider')::public.data_source,'crm1:' || source_uuid::text || ':' || encode(sha256(convert_to(native_ref,'UTF8')),'hex'),pol.id,true,(p_input->>'observedAt')::timestamptz) returning id into ref_id;
    insert into private.crm_source_bindings(reference_id,workspace_id,lead_id,source_id,native_reference,provenance_id,lineage_ids,expires_at)
      values(ref_id,p_workspace,l.id,source_uuid,native_ref,(p_input->>'provenanceId')::uuid,array(select value::uuid from jsonb_array_elements_text(p_input->'lineageIds')),expiry);
    return jsonb_build_object('leadId',l.id,'duplicate',false);
  elsif p_action in ('update','note','details') then
    select * into l from public.leads where id=(p_input->>'leadId')::uuid and workspace_id=p_workspace and archived_at is null for update;
    if l.id is null then raise exception using errcode='42501',message='Lead não autorizado.'; end if;
    if p_action='update' then
      if (p_input->>'expectedUpdatedAt')::timestamptz is distinct from l.updated_at then raise exception using errcode='40001',message='Registro foi alterado.'; end if;
      update public.leads set stage=(p_input->>'stage')::public.lead_stage,assigned_to=assignee,tags=tag_values,do_not_contact=(p_input->>'doNotContact')::boolean,next_contact_at=next_at where id=l.id;
      return jsonb_build_object('leadId',l.id,'duplicate',false);
    elsif p_action='note' then
      note_id:=(p_input->>'requestId')::uuid;
      if note_id is null or p_input->>'body' is null or length(btrim(p_input->>'body')) not between 1 and 4000 then raise exception using errcode='22023',message='Anotação inválida.'; end if;
      if exists(select 1 from public.lead_notes where id=note_id and (workspace_id<>p_workspace or lead_id<>l.id or created_by<>auth.uid() or body<>btrim(p_input->>'body'))) then raise exception using errcode='42501',message='Identificador indisponível.'; end if;
      insert into public.lead_notes(id,workspace_id,lead_id,body,crm_authored) values(note_id,p_workspace,l.id,btrim(p_input->>'body'),true) on conflict(id) do nothing;
      return jsonb_build_object('leadId',l.id,'duplicate',false);
    end if;
  end if;
  -- Projeção de metadados; conteúdo de fonte nunca é copiado para leads.
  skip:=case when p_action='list' then coalesce((p_input->>'page')::integer,0)*50 else 0 end;
  if skip not between 0 and 9950 then raise exception using errcode='22023',message='Página inválida.'; end if;
  if p_action='export' and (jsonb_typeof(p_input->'leadIds') is distinct from 'array' or jsonb_array_length(p_input->'leadIds') not between 1 and 50) then raise exception using errcode='22023',message='Seleção inválida.'; end if;
  select coalesce(jsonb_agg(q.value order by q.created_at desc,q.id desc),'[]'::jsonb) into items from (
    select a.id,a.created_at,jsonb_build_object('id',a.id,'internalLabel',case when a.crm_mode='legacy' then 'Lead legado não verificado' else a.name end,'mode',a.crm_mode,'stage',a.stage,'assignedTo',a.assigned_to,'tags',a.tags,'doNotContact',a.do_not_contact,'nextContactAt',a.next_contact_at,'createdAt',a.created_at,'updatedAt',a.updated_at,
      'binding',case when s.reference_id is null then null else jsonb_build_object('sourceId',s.source_id,'reference',s.native_reference,'provenanceId',s.provenance_id,'expiresAt',s.expires_at,'lineageIds',s.lineage_ids) end) value
    from public.leads a left join private.crm_source_bindings s on s.lead_id=a.id and s.workspace_id=a.workspace_id
    where a.workspace_id=p_workspace and a.archived_at is null
      and (p_action<>'details' or a.id=l.id)
      and (p_action<>'export' or a.id in (select value::uuid from jsonb_array_elements_text(p_input->'leadIds')))
    order by a.created_at desc,a.id desc limit 51 offset skip
  ) q;
  result:=jsonb_build_object('leads',items,'members','[]'::jsonb,'notes','[]'::jsonb,'history','[]'::jsonb);
  if p_action in ('list','details') then
    select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.display_name) order by p.display_name),'[]'::jsonb) into items from (select * from public.workspace_members where workspace_id=p_workspace order by user_id limit 500) m join public.profiles p on p.id=m.user_id;
    result:=jsonb_set(result,'{members}',items);
  end if;
  if p_action='details' then
    select coalesce(jsonb_agg(n.value order by n.created_at desc),'[]'::jsonb) into items from (select created_at,jsonb_build_object('id',id,'body',body,'createdBy',created_by,'createdAt',created_at) value from public.lead_notes where workspace_id=p_workspace and lead_id=l.id and crm_authored order by created_at desc limit 50) n;
    result:=jsonb_set(result,'{notes}',items);
    select coalesce(jsonb_agg(h.value order by h.created_at desc),'[]'::jsonb) into items from (select created_at,jsonb_build_object('id',id,'from',from_stage,'to',to_stage,'changedBy',changed_by,'createdAt',created_at) value from public.lead_stage_history where workspace_id=p_workspace and lead_id=l.id order by created_at desc limit 50) h;
    result:=jsonb_set(result,'{history}',items);
  end if;
  return result;
end $$;
create function public.ag_crm(p_workspace uuid,p_action text,p_input jsonb default '{}',p_executor text default null) returns jsonb language sql security invoker set search_path='' as $$select private.ag_crm(p_workspace,p_action,p_input,p_executor)$$;
revoke all on function private.ag_crm(uuid,text,jsonb,text),public.ag_crm(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function private.ag_crm(uuid,text,jsonb,text),public.ag_crm(uuid,text,jsonb,text) to authenticated;
comment on column public.leads.crm_mode is 'manual: identificação interna, não comprova origem de fatos externos nem permite exportar texto livre. catalog: conteúdo consultado sob demanda na fonte; só referência autorizada é retida.';
commit;
