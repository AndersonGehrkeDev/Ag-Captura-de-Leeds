begin;

-- Metadados próprios de orquestração. Sem URL, resposta, notas ou recomendações do PSI.
create table private.audit_requests (
  job_id uuid primary key references public.async_jobs(id) on delete cascade,
  source_id uuid not null, website_provenance_id uuid not null,
  strategy text not null check(strategy in ('mobile','desktop')),
  outcome text check(outcome in ('completed','inconclusive','failed'))
);
create table private.audit_executor_config (
  singleton boolean primary key default true check(singleton),
  secret_sha256 text not null check(secret_sha256 ~ '^[a-f0-9]{64}$')
);
alter table private.audit_requests enable row level security;
alter table private.audit_executor_config enable row level security;
revoke all on private.audit_requests, private.audit_executor_config from public, anon, authenticated, service_role;

create function private.ag_audit_task(p_workspace uuid,p_action text,p_source uuid default null,p_website uuid default null,
  p_strategy text default 'mobile',p_key text default null,p_job uuid default null,p_outcome text default null,p_error text default null,p_executor text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.async_jobs%rowtype; r private.audit_requests%rowtype; reservation uuid;
begin
  if auth.uid() is null or not private.ag_has_role(p_workspace) then raise exception using errcode='42501',message='Auditoria não autorizada.'; end if;
  if p_action is null or p_action not in ('enqueue','claim','finish','status') then raise exception using errcode='22023',message='Operação inválida.'; end if;
  -- Serializa apenas alterações curtas deste workspace, não a chamada HTTP externa.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace::text || ':website_audit',0));
  if p_action in ('enqueue','claim','finish') and (p_executor is null or length(p_executor)<64 or not exists(
    select 1 from private.audit_executor_config where singleton and secret_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_executor,'UTF8')),'hex')
  )) then raise exception using errcode='42501',message='Executor não configurado ou não autorizado.'; end if;

  -- Recuperação durável na próxima leitura/ação. Nunca repete uma análise já iniciada.
  update public.async_jobs set state='failed',lease_until=null,worker_id=null,completed_at=now(),error_code='internal_error'
  where workspace_id=p_workspace and kind='website_audit' and state='running'
    and lease_until<=now() and exists(select 1 from private.audit_requests a where a.job_id=async_jobs.id);

  if p_action='enqueue' then
    if p_source is null or p_website is null or p_strategy not in ('mobile','desktop') or p_key is null or length(p_key) not between 8 and 100 then
      raise exception using errcode='22023',message='Parâmetros inválidos.';
    end if;
    select * into j from public.async_jobs where workspace_id=p_workspace and kind='website_audit' and idempotency_key=p_key;
    if found then
      select * into r from private.audit_requests where job_id=j.id;
      if j.created_by<>auth.uid() or r.source_id is distinct from p_source or r.website_provenance_id is distinct from p_website or r.strategy is distinct from p_strategy then
        raise exception using errcode='42501',message='Identificador já utilizado.';
      end if;
    else
      if (select count(*) from public.async_jobs where workspace_id=p_workspace and kind='website_audit' and created_at>=date_trunc('day',now()))>=10 then
        raise exception using errcode='P0001',message='Limite diário de auditorias atingido.';
      end if;
      reservation:=private.ag_reserve_usage(p_workspace,'website_audit',1,p_key);
      insert into public.async_jobs(workspace_id,kind,idempotency_key,max_attempts,created_by) values(p_workspace,'website_audit',p_key,1,auth.uid()) returning * into j;
      insert into private.audit_requests(job_id,source_id,website_provenance_id,strategy) values(j.id,p_source,p_website,p_strategy);
      update public.usage_reservations set job_id=j.id where id=reservation;
    end if;
  else
    if p_job is not null then
      select * into j from public.async_jobs where id=p_job and workspace_id=p_workspace and created_by=auth.uid() and kind='website_audit';
    else
      select q.* into j from public.async_jobs q join private.audit_requests a on a.job_id=q.id
      where q.workspace_id=p_workspace and q.created_by=auth.uid() and q.kind='website_audit' and a.source_id=p_source
        and a.website_provenance_id=p_website and a.strategy=p_strategy order by q.created_at desc limit 1;
    end if;
    if j.id is null then
      if p_action='status' then return null; end if;
      raise exception using errcode='42501',message='Tarefa indisponível.';
    end if;
    if not exists(select 1 from private.audit_requests where job_id=j.id) then raise exception using errcode='42501',message='Tarefa indisponível.'; end if;
    if j.state='queued' and j.created_at<=now()-interval '5 minutes' then
      select id into reservation from public.usage_reservations where job_id=j.id;
      if exists(select 1 from public.usage_reservations where id=reservation and state='reserved') then
        perform private.ag_settle_usage(reservation,'released',null);
      end if;
      update public.async_jobs set state='failed',completed_at=now(),error_code='internal_error' where id=j.id returning * into j;
    end if;
    if p_action='claim' then
      if j.state<>'queued' then raise exception using errcode='55000',message='Tarefa já iniciada ou encerrada.'; end if;
      if exists(select 1 from public.async_jobs where workspace_id=p_workspace and kind='website_audit' and state='running') then
        raise exception using errcode='P0001',message='Outra auditoria está processando.';
      end if;
      select id into reservation from public.usage_reservations where job_id=j.id;
      -- Debita uma tentativa antes da chamada. Falhas/interrupções não liberam novas chamadas ilimitadas.
      perform private.ag_settle_usage(reservation,'committed',1);
      update public.async_jobs set state='running',attempts=attempts+1,lease_until=now()+interval '90 seconds',worker_id=auth.uid()::text
      where id=j.id returning * into j;
    elsif p_action='finish' then
      if j.state<>'running' or j.lease_until<=now() or p_outcome is null or p_outcome not in ('completed','inconclusive','failed')
        or (p_error is not null and p_error not in ('provider_unavailable','rate_limited','invalid_request','unauthorized','internal_error')) then
        raise exception using errcode='22023',message='Conclusão incompatível com a tarefa.';
      end if;
      update private.audit_requests set outcome=p_outcome where job_id=j.id;
      update public.async_jobs set state=case when p_outcome='failed' then 'failed'::public.operation_state else 'completed'::public.operation_state end,
        completed_at=now(),lease_until=null,worker_id=null,error_code=p_error where id=j.id returning * into j;
    end if;
  end if;
  select * into r from private.audit_requests where job_id=j.id;
  return jsonb_build_object('id',j.id,'workspaceId',j.workspace_id,'sourceId',r.source_id,'websiteProvenanceId',r.website_provenance_id,
    'strategy',r.strategy,'state',case when j.state='queued' then 'pending' when j.state='running' then 'processing' when j.state='completed' then coalesce(r.outcome,'inconclusive') else 'failed' end,
    'createdAt',j.created_at,'completedAt',j.completed_at,'errorCode',j.error_code);
end $$;

create function public.ag_audit_task(p_workspace uuid,p_action text,p_source uuid default null,p_website uuid default null,
  p_strategy text default 'mobile',p_key text default null,p_job uuid default null,p_outcome text default null,p_error text default null,p_executor text default null)
returns jsonb language sql security invoker set search_path='' as $$
  select private.ag_audit_task(p_workspace,p_action,p_source,p_website,p_strategy,p_key,p_job,p_outcome,p_error,p_executor)
$$;
revoke all on function private.ag_audit_task(uuid,text,uuid,uuid,text,text,uuid,text,text,text),public.ag_audit_task(uuid,text,uuid,uuid,text,text,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function private.ag_audit_task(uuid,text,uuid,uuid,text,text,uuid,text,text,text),public.ag_audit_task(uuid,text,uuid,uuid,text,text,uuid,text,text,text) to authenticated;
commit;
