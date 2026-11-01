begin;
-- Cache OSM separado do CRM. Nenhuma resposta bruta, contatos, fotos ou avaliações.
create table private.open_business_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  native_reference text not null check(native_reference ~ '^(node|way|relation)/[1-9][0-9]{0,15}$'),
  record jsonb not null check(jsonb_typeof(record)='object' and octet_length(record::text)<=6000),
  observed_at timestamptz not null, expires_at timestamptz not null,
  primary key(workspace_id,native_reference)
);
create index open_records_expiry on private.open_business_records(workspace_id,expires_at);
create table private.open_search_cache (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  cache_key text not null check(cache_key ~ '^[a-f0-9]{64}$'), body jsonb not null check(octet_length(body::text)<=400000),
  expires_at timestamptz not null, primary key(workspace_id,cache_key)
);
create table private.open_search_gate (
  singleton boolean primary key default true check(singleton), lease_id uuid, lease_workspace uuid references public.workspaces(id), lease_until timestamptz not null default '-infinity',
  next_request_at timestamptz not null default '-infinity', usage_day date not null default (now() at time zone 'UTC')::date,
  used integer not null default 0 check(used between 0 and 100)
);
insert into private.open_search_gate(singleton) values(true);
alter table private.open_business_records enable row level security;
alter table private.open_search_cache enable row level security;
alter table private.open_search_gate enable row level security;
revoke all on private.open_business_records,private.open_search_cache,private.open_search_gate from public,anon,authenticated,service_role;

create function private.ag_open_data(p_workspace uuid,p_action text,p_input jsonb default '{}',p_executor text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare gate private.open_search_gate%rowtype; item jsonb; result jsonb; stamp timestamptz; today date := (now() at time zone 'UTC')::date;
begin
  if auth.uid() is null or not private.ag_has_role(p_workspace) then raise exception using errcode='42501',message='Fonte não autorizada.'; end if;
  if p_executor is null or length(p_executor)<>64 or not exists(select 1 from private.crm_executor_config where singleton and secret_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_executor,'UTF8')),'hex')) then
    raise exception using errcode='42501',message='Executor indisponível.';
  end if;
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>400000 then raise exception using errcode='22023',message='Entrada inválida.'; end if;
  -- Serializa quota global e escrita/limpeza por workspace, inclusive em instâncias serverless distintas.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace::text || ':osm-cache',0));
  delete from private.open_business_records where workspace_id=p_workspace and expires_at<=now();
  delete from private.open_search_cache where workspace_id=p_workspace and expires_at<=now();
  if p_action='list' then
    select coalesce(jsonb_agg(r.record order by r.native_reference),'[]'::jsonb) into result from private.open_business_records r where workspace_id=p_workspace;
    return result;
  elsif p_action='cache' then
    select body into result from private.open_search_cache where workspace_id=p_workspace and cache_key=p_input->>'key'; return result;
  elsif p_action='reserve' then
    select * into gate from private.open_search_gate where singleton for update;
    if gate.usage_day<>today then gate.used:=0; end if;
    if gate.used>=100 or gate.lease_until>now() or gate.next_request_at>now() then return jsonb_build_object('allowed',false); end if;
    gate.lease_id:=gen_random_uuid();
    update private.open_search_gate set lease_id=gate.lease_id,lease_workspace=p_workspace,lease_until=now()+interval '55 seconds',next_request_at=now()+interval '10 seconds',usage_day=today,used=gate.used+1 where singleton;
    return jsonb_build_object('allowed',true,'token',gate.lease_id);
  elsif p_action='release' then
    update private.open_search_gate set lease_until=now() where singleton and lease_workspace=p_workspace and lease_id=(p_input->>'token')::uuid;
    return '{}';
  elsif p_action='save' then
    if not exists(select 1 from private.open_search_gate where singleton and lease_workspace=p_workspace and lease_id=(p_input->>'token')::uuid and lease_until>now())
      or p_input->>'key' !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_input->'body') is distinct from 'object'
      or jsonb_typeof(p_input->'body'->'records') is distinct from 'array' or jsonb_array_length(p_input->'body'->'records')>60
      or jsonb_typeof(p_input->'body'->'limited') is distinct from 'boolean' then raise exception using errcode='22023',message='Cache inválido.'; end if;
    stamp:=(p_input->'body'->>'observedAt')::timestamptz;
    if stamp is null or stamp>now() or stamp<now()-interval '5 minutes' then raise exception using errcode='22023',message='Data inválida.'; end if;
    for item in select value from jsonb_array_elements(p_input->'body'->'records') loop
      if jsonb_typeof(item)<>'object' or item-array['reference','name','category','website','address','city','latitude','longitude','observedAt']<>'{}'::jsonb
        or item->>'reference' !~ '^(node|way|relation)/[1-9][0-9]{0,15}$' or length(item->>'name') not between 1 and 200
        or length(item->>'category') not between 1 and 100 or length(item->>'city') not between 2 and 120
        or (item->>'latitude')::double precision not between -90 and 90 or (item->>'longitude')::double precision not between -180 and 180
        or (item->>'observedAt')::timestamptz is distinct from stamp then raise exception using errcode='22023',message='Registro inválido.'; end if;
      insert into private.open_business_records(workspace_id,native_reference,record,observed_at,expires_at)
        values(p_workspace,item->>'reference',item,stamp,stamp+interval '365 days')
        on conflict(workspace_id,native_reference) do update set record=excluded.record,observed_at=excluded.observed_at,expires_at=excluded.expires_at;
    end loop;
    -- Mantém no máximo 1.000 referências consultáveis por workspace. Leads retidos têm prioridade.
    delete from private.open_business_records r where r.workspace_id=p_workspace and r.native_reference in (
      select x.native_reference from private.open_business_records x where x.workspace_id=p_workspace
        and not exists(select 1 from private.crm_source_bindings b where b.workspace_id=x.workspace_id and b.source_id='53c382fe-d654-4d6a-b0e7-07d8cd7bd040' and b.native_reference=x.native_reference)
      order by x.observed_at asc,x.native_reference offset 0 limit greatest(0,(select count(*)::integer-1000 from private.open_business_records where workspace_id=p_workspace))
    );
    if (select count(*) from private.open_business_records where workspace_id=p_workspace)>1000 then raise exception using errcode='54000',message='Limite de registros atingido.'; end if;
    insert into private.open_search_cache(workspace_id,cache_key,body,expires_at) values(p_workspace,p_input->>'key',p_input->'body',stamp+interval '24 hours')
      on conflict(workspace_id,cache_key) do update set body=excluded.body,expires_at=excluded.expires_at;
    delete from private.open_search_cache where workspace_id=p_workspace and cache_key in (select cache_key from private.open_search_cache where workspace_id=p_workspace order by expires_at desc offset 100);
    return '{}';
  end if;
  raise exception using errcode='22023',message='Operação inválida.';
end $$;
create function public.ag_open_data(p_workspace uuid,p_action text,p_input jsonb default '{}',p_executor text default null) returns jsonb language sql security invoker set search_path='' as $$select private.ag_open_data(p_workspace,p_action,p_input,p_executor)$$;
revoke all on function private.ag_open_data(uuid,text,jsonb,text),public.ag_open_data(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function private.ag_open_data(uuid,text,jsonb,text),public.ag_open_data(uuid,text,jsonb,text) to authenticated;

-- A base inicial é provisionada por operador, nunca por auto-claim ou DTO.
insert into public.data_usage_policies(id,workspace_id,source,purpose,version,persistence,allowed_fields,allows_export,allows_ai,retention_days,rules_url,reviewed_at,valid_until,reviewed_by,created_by)
select 'bd5613ae-96fe-4f70-96ce-6b3f6fba7c31',workspace_id,'authorized_import','prospecting',1,'identifier_only',array['external_id'],false,false,365,
  'https://www.openstreetmap.org/copyright','2026-10-31T00:00:00Z','2027-10-31T23:59:59Z',user_id,user_id
from public.workspace_members where workspace_id='00000000-0000-4000-8000-000000000001' and role='owner' order by user_id limit 1
on conflict(workspace_id,source,purpose,version) do nothing;
commit;
