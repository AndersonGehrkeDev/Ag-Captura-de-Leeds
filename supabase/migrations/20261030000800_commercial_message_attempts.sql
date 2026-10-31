begin;
-- Somente credencial de execução e metadados próprios nas tabelas existentes. Sem prompts/saídas.
create table private.message_executor_config (
  singleton boolean primary key default true check(singleton), secret_sha256 text not null check(secret_sha256 ~ '^[a-f0-9]{64}$')
);
alter table private.message_executor_config enable row level security;
revoke all on private.message_executor_config from public,anon,authenticated,service_role;

create function private.ag_message_attempt(p_workspace uuid,p_action text,p_key text default null,p_job uuid default null,p_error text default null,p_executor text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare j public.async_jobs%rowtype; reservation uuid;
begin
  if auth.uid() is null or not private.ag_has_role(p_workspace) then raise exception using errcode='42501',message='Geração não autorizada.'; end if;
  if p_executor is null or length(p_executor)<>64 or not exists(select 1 from private.message_executor_config where singleton and secret_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_executor,'UTF8')),'hex')) then
    raise exception using errcode='42501',message='Executor indisponível.';
  end if;
  if p_action is null or p_action not in ('start','finish') then raise exception using errcode='22023',message='Operação inválida.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace::text || ':ai_generation',0));
  update public.async_jobs set state='failed',completed_at=now(),lease_until=null,worker_id=null,error_code='internal_error'
    where workspace_id=p_workspace and kind='ai_generation' and state='running' and lease_until<=now();
  if p_action='start' then
    if p_key is null or p_key !~ '^message:[a-f0-9-]{36}$' then raise exception using errcode='22023',message='Identificador inválido.'; end if;
    select * into j from public.async_jobs where workspace_id=p_workspace and kind='ai_generation' and idempotency_key=p_key;
    if found then
      if j.created_by<>auth.uid() then raise exception using errcode='42501',message='Identificador indisponível.'; end if;
      return null; -- Nunca repetir uma chamada já iniciada, inclusive após perda da resposta.
    end if;
    if exists(select 1 from public.async_jobs where workspace_id=p_workspace and kind='ai_generation' and state='running') or
      (select count(*) from public.async_jobs where workspace_id=p_workspace and kind='ai_generation' and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=20 then
      raise exception using errcode='P0001',message='Limite de gerações atingido.';
    end if;
    reservation:=private.ag_reserve_usage(p_workspace,'ai_generation',1,p_key);
    -- Consome uma tentativa antes da chamada; não é cálculo de cobrança em tokens da OpenAI.
    perform private.ag_settle_usage(reservation,'committed',1);
    insert into public.async_jobs(workspace_id,kind,idempotency_key,state,attempts,max_attempts,lease_until,worker_id,created_by)
      values(p_workspace,'ai_generation',p_key,'running',1,1,now()+interval '90 seconds',auth.uid()::text,auth.uid()) returning * into j;
    update public.usage_reservations set job_id=j.id where id=reservation;
  else
    select * into j from public.async_jobs where id=p_job and workspace_id=p_workspace and created_by=auth.uid() and kind='ai_generation' for update;
    if j.id is null or j.state<>'running' or j.lease_until<=now() or (p_error is not null and p_error not in ('provider_unavailable','rate_limited','internal_error')) then
      raise exception using errcode='42501',message='Tarefa indisponível.';
    end if;
    update public.async_jobs set state=case when p_error is null then 'completed'::public.operation_state else 'failed'::public.operation_state end,
      completed_at=now(),lease_until=null,worker_id=null,error_code=p_error where id=j.id;
  end if;
  return j.id;
end $$;
create function public.ag_message_attempt(p_workspace uuid,p_action text,p_key text default null,p_job uuid default null,p_error text default null,p_executor text default null)
returns uuid language sql security invoker set search_path='' as $$select private.ag_message_attempt(p_workspace,p_action,p_key,p_job,p_error,p_executor)$$;
revoke all on function private.ag_message_attempt(uuid,text,text,uuid,text,text),public.ag_message_attempt(uuid,text,text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.ag_message_attempt(uuid,text,text,uuid,text,text),public.ag_message_attempt(uuid,text,text,uuid,text,text) to authenticated;
commit;
