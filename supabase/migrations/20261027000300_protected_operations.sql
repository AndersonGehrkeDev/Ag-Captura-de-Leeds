begin;

create function private.ag_initialize_reference_policy(p_workspace uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.data_usage_policies(workspace_id,source,purpose,version,persistence,allowed_fields,rules_url,reviewed_at)
  values(p_workspace,'google_places','prospecting',1,'identifier_only',array['place_id'],
    'https://developers.google.com/maps/documentation/places/web-service/policies',now())
  on conflict (workspace_id,source,purpose,version) do nothing;
$$;

-- Somente operador confiável: não existe autoassociação ao workspace inicial.
create function private.ag_provision_workspace(p_workspace uuid, p_owner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare w public.workspaces%rowtype;
begin
  select * into w from public.workspaces where id = p_workspace for update;
  if not found or w.state <> 'pending_owner' then raise exception using errcode='22023', message='Workspace não está disponível para provisionamento.'; end if;
  if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null) then
    raise exception using errcode='22023', message='Proprietário deve ser um usuário existente com e-mail confirmado.';
  end if;
  insert into public.workspace_members(workspace_id,user_id,role,created_by) values(p_workspace,p_owner,'owner',p_owner);
  update public.workspaces set owner_id=p_owner,state='active' where id=p_workspace;
  perform private.ag_initialize_reference_policy(p_workspace);
  perform private.ag_emit_audit(p_workspace,'workspace_provisioned','workspaces',p_workspace,array['owner_id','state']);
end $$;

create function private.ag_allow_workspace_creation(p_user uuid, p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_enabled is null then raise exception using errcode='22023', message='Parâmetros inválidos.'; end if;
  insert into private.workspace_creation_grants(user_id,enabled) values(p_user,p_enabled)
  on conflict(user_id) do update set enabled=excluded.enabled;
  perform private.ag_emit_audit(null,'update','workspace_creation_grants',p_user,array['enabled']);
end $$;

create function private.ag_create_workspace(p_name text,p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from private.workspace_creation_grants where user_id=auth.uid() and enabled) then
    raise exception using errcode='42501', message='Criação de workspace não autorizada.';
  end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 120 or p_slug is null
    or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) not between 2 and 80 then
    raise exception using errcode='22023', message='Nome ou identificador de workspace inválido.';
  end if;
  insert into public.workspaces(name,slug,created_by) values(btrim(p_name),p_slug,auth.uid()) returning id into new_id;
  insert into public.workspace_members(workspace_id,user_id,role,created_by) values(new_id,auth.uid(),'owner',auth.uid());
  update public.workspaces set owner_id=auth.uid(),state='active' where id=new_id;
  perform private.ag_initialize_reference_policy(new_id);
  perform private.ag_emit_audit(new_id,'workspace_provisioned','workspaces',new_id,array['owner_id','state']);
  return new_id;
end $$;

create function private.ag_change_member_role(p_workspace uuid,p_user uuid,p_role public.workspace_role) returns void
language plpgsql security definer set search_path = '' as $$
declare target_role public.workspace_role;
begin
  perform 1 from public.workspaces where id=p_workspace for update;
  if not private.ag_has_role(p_workspace,array['owner']::public.workspace_role[]) then raise exception using errcode='42501', message='Somente o proprietário pode trocar papéis.'; end if;
  select role into target_role from public.workspace_members where workspace_id=p_workspace and user_id=p_user for update;
  if not found or p_role is null then raise exception using errcode='22023', message='Membro ou papel inválido.'; end if;
  if target_role='owner' or p_role='owner' then raise exception using errcode='42501', message='Use a transferência protegida de proprietário.'; end if;
  update public.workspace_members set role=p_role where workspace_id=p_workspace and user_id=p_user and role<>p_role;
end $$;

create function private.ag_transfer_ownership(p_workspace uuid,p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare previous_owner uuid;
begin
  select owner_id into previous_owner from public.workspaces where id=p_workspace for update;
  if not private.ag_has_role(p_workspace,array['owner']::public.workspace_role[]) or previous_owner is distinct from auth.uid() then
    raise exception using errcode='42501', message='Transferência de proprietário não autorizada.';
  end if;
  if p_user is null or p_user=previous_owner or not exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=p_user) then
    raise exception using errcode='22023', message='Novo proprietário deve ser outro membro do workspace.';
  end if;
  update public.workspace_members set role='admin' where workspace_id=p_workspace and user_id=previous_owner;
  update public.workspace_members set role='owner' where workspace_id=p_workspace and user_id=p_user;
  update public.workspaces set owner_id=p_user where id=p_workspace;
  perform private.ag_emit_audit(p_workspace,'ownership_transferred','workspaces',p_workspace,array['owner_id']);
end $$;

create function private.ag_remove_member(p_workspace uuid,p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare caller_role public.workspace_role; target_role public.workspace_role;
begin
  perform 1 from public.workspaces where id=p_workspace for update;
  if not private.ag_has_role(p_workspace) then raise exception using errcode='42501', message='Associação ao workspace necessária.'; end if;
  select role into caller_role from public.workspace_members where workspace_id=p_workspace and user_id=auth.uid();
  select role into target_role from public.workspace_members where workspace_id=p_workspace and user_id=p_user;
  if not found then raise exception using errcode='22023', message='Membro inválido.'; end if;
  if target_role='owner' or not (p_user=auth.uid() or caller_role='owner' or (caller_role='admin' and target_role='member')) then
    raise exception using errcode='42501', message='Remoção de membro não autorizada.';
  end if;
  delete from public.workspace_members where workspace_id=p_workspace and user_id=p_user;
end $$;

create function private.ag_create_invitation(p_workspace uuid,p_email text,p_role public.workspace_role default 'member') returns text
language plpgsql security definer set search_path = '' as $$
declare caller_role public.workspace_role; invite_id uuid; raw_token text; canonical_email text;
begin
  perform 1 from public.workspaces where id=p_workspace for update;
  if not private.ag_has_role(p_workspace,array['owner','admin']::public.workspace_role[]) then
    raise exception using errcode='42501', message='Criação de convite não autorizada.';
  end if;
  select role into caller_role from public.workspace_members where workspace_id=p_workspace and user_id=auth.uid();
  if p_role is null or p_role='owner' or (caller_role='admin' and p_role<>'member') then
    raise exception using errcode='42501', message='Papel do convite não autorizado.';
  end if;
  canonical_email:=lower(btrim(p_email));
  if canonical_email is null or canonical_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(canonical_email)>254 then
    raise exception using errcode='22023', message='E-mail de convite inválido.';
  end if;
  update public.workspace_invitations set revoked_at=now()
    where workspace_id=p_workspace and email=canonical_email and expires_at<=now() and accepted_at is null and revoked_at is null;
  raw_token:=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into public.workspace_invitations(workspace_id,email,role,created_by) values(p_workspace,canonical_email,p_role,auth.uid()) returning id into invite_id;
  insert into private.invitation_tokens(invitation_id,token_hash)
    values(invite_id,encode(sha256(convert_to(raw_token,'UTF8')),'hex'));
  perform private.ag_emit_audit(p_workspace,'invitation_created','workspace_invitations',invite_id,array['email','role']);
  return raw_token;
end $$;

create function private.ag_accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invite public.workspace_invitations%rowtype; verified_email text;
begin
  if auth.uid() is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='42501', message='Convite inválido ou expirado.';
  end if;
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select i.* into invite from public.workspace_invitations i join private.invitation_tokens t on t.invitation_id=i.id
    where t.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update of i;
  if not found or verified_email is null or verified_email<>invite.email or invite.expires_at<=now()
    or invite.revoked_at is not null or invite.accepted_at is not null
    or not exists(select 1 from public.workspaces where id=invite.workspace_id and state='active') then
    raise exception using errcode='42501', message='Convite inválido ou expirado.';
  end if;
  if exists(select 1 from public.workspace_members where workspace_id=invite.workspace_id and user_id=auth.uid()) then
    raise exception using errcode='22023', message='Usuário já pertence ao workspace; convite não altera papéis existentes.';
  end if;
  insert into public.workspace_members(workspace_id,user_id,role,created_by) values(invite.workspace_id,auth.uid(),invite.role,auth.uid());
  update public.workspace_invitations set accepted_at=now(),accepted_by=auth.uid() where id=invite.id;
  delete from private.invitation_tokens where invitation_id=invite.id;
  perform private.ag_emit_audit(invite.workspace_id,'invitation_accepted','workspace_invitations',invite.id,array['accepted_at','accepted_by']);
  return invite.workspace_id;
end $$;

create function private.ag_revoke_invitation(p_workspace uuid,p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target_role public.workspace_role;
begin
  perform 1 from public.workspaces where id=p_workspace for update;
  if not private.ag_has_role(p_workspace,array['owner','admin']::public.workspace_role[]) then raise exception using errcode='42501', message='Revogação não autorizada.'; end if;
  select role into target_role from public.workspace_invitations where workspace_id=p_workspace and id=p_invitation and accepted_at is null for update;
  if not found then raise exception using errcode='22023', message='Convite indisponível.'; end if;
  if target_role='admin' and not private.ag_has_role(p_workspace,array['owner']::public.workspace_role[]) then raise exception using errcode='42501', message='Somente o proprietário pode revogar este convite.'; end if;
  update public.workspace_invitations set revoked_at=coalesce(revoked_at,now()) where id=p_invitation;
  delete from private.invitation_tokens where invitation_id=p_invitation;
  perform private.ag_emit_audit(p_workspace,'invitation_revoked','workspace_invitations',p_invitation,array['revoked_at']);
end $$;

-- Reserva atômica: o limite é configurado por operador, não por parâmetros do usuário.
create function private.ag_reserve_usage(p_workspace uuid,p_resource public.job_kind,p_units integer,p_idempotency_key text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare counter_row public.usage_counters%rowtype; existing public.usage_reservations%rowtype; reservation_id uuid;
begin
  if not private.ag_has_role(p_workspace) then raise exception using errcode='42501', message='Reserva não autorizada.'; end if;
  if p_units is null or p_units not between 1 and 100 or p_resource is null or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then
    raise exception using errcode='22023', message='Parâmetros de reserva inválidos.';
  end if;
  select * into counter_row from public.usage_counters where workspace_id=p_workspace and resource=p_resource
    and period_start=date_trunc('month',now() at time zone 'UTC')::date for update;
  if not found then raise exception using errcode='22023', message='Limite de consumo não configurado para este período.'; end if;
  select * into existing from public.usage_reservations where workspace_id=p_workspace and resource=p_resource and idempotency_key=p_idempotency_key;
  if found then
    if existing.created_by<>auth.uid() or existing.units<>p_units then raise exception using errcode='22023', message='Chave de idempotência já utilizada com outros parâmetros.'; end if;
    return existing.id;
  end if;
  if counter_row.used_units+counter_row.reserved_units+p_units>counter_row.unit_limit then
    raise exception using errcode='P0001', message='Limite de consumo atingido.';
  end if;
  update public.usage_counters set reserved_units=reserved_units+p_units where id=counter_row.id;
  insert into public.usage_reservations(workspace_id,counter_id,resource,idempotency_key,units,created_by)
    values(p_workspace,counter_row.id,p_resource,p_idempotency_key,p_units,auth.uid()) returning id into reservation_id;
  perform private.ag_emit_audit(p_workspace,'usage_reserved','usage_reservations',reservation_id,array['units','state']);
  return reservation_id;
end $$;

create function private.ag_settle_usage(p_reservation uuid,p_state public.reservation_state,p_actual_units integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare reservation_row public.usage_reservations%rowtype; counter_id_value uuid;
begin
  if p_state is null or p_state not in ('committed','released','expired') then raise exception using errcode='22023', message='Estado de liquidação inválido.'; end if;
  select counter_id into counter_id_value from public.usage_reservations where id=p_reservation;
  if not found then raise exception using errcode='22023', message='Reserva indisponível.'; end if;
  -- A ordem de locks é sempre contador -> reserva.
  perform 1 from public.usage_counters where id=counter_id_value for update;
  select * into reservation_row from public.usage_reservations where id=p_reservation for update;
  if reservation_row.state<>'reserved' then
    if reservation_row.state=p_state and reservation_row.actual_units is not distinct from p_actual_units then return; end if;
    raise exception using errcode='22023', message='Reserva já liquidada com outro resultado.';
  end if;
  if (p_state='committed' and (p_actual_units is null or p_actual_units<0 or p_actual_units>reservation_row.units or reservation_row.expires_at<=now()))
    or (p_state<>'committed' and p_actual_units is not null)
    or (p_state='expired' and reservation_row.expires_at>now()) then
    raise exception using errcode='22023', message='Consumo ou expiração incompatível com a reserva.';
  end if;
  update public.usage_counters set reserved_units=reserved_units-reservation_row.units,
    used_units=used_units+coalesce(p_actual_units,0) where id=counter_id_value;
  update public.usage_reservations set state=p_state,actual_units=p_actual_units,settled_at=now() where id=p_reservation;
  perform private.ag_emit_audit(reservation_row.workspace_id,'usage_settled','usage_reservations',p_reservation,array['state','actual_units','settled_at']);
end $$;

-- Limpeza explícita, limitada por lote. Agendamento/executor não é ativado nesta etapa.
create function private.ag_purge_expired_data(p_batch integer default 100) returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; total integer:=0; changed integer;
begin
  if p_batch is null or p_batch not between 1 and 1000 then raise exception using errcode='22023', message='Lote inválido.'; end if;
  for r in select id from public.usage_reservations where state='reserved' and expires_at<=now() order by expires_at limit p_batch loop
    perform private.ag_settle_usage(r.id,'expired',null); total:=total+1;
  end loop;
  delete from public.ai_generations where id in (select a.id from public.ai_generations a where a.retention_until<=now() or not private.ag_policy_allows(a.workspace_id,a.policy_id,a.purpose,true) limit p_batch);
  get diagnostics changed=row_count; total:=total+changed;
  delete from public.website_audits where id in (select a.id from public.website_audits a where a.retention_until<=now() or not private.ag_policy_allows(a.workspace_id,a.policy_id,a.purpose) limit p_batch);
  get diagnostics changed=row_count; total:=total+changed;
  for r in select id,workspace_id from public.search_history where retention_until<=now() order by retention_until limit p_batch loop
    update public.async_jobs set search_id=null,state='cancelled',worker_id=null,lease_until=null,completed_at=now() where search_id=r.id;
    delete from public.search_history where id=r.id; total:=total+1;
    perform private.ag_emit_audit(r.workspace_id,'delete','search_history',r.id,array['retention_until']);
  end loop;
  delete from private.invitation_tokens where invitation_id in (select id from public.workspace_invitations where expires_at<=now() or revoked_at is not null or accepted_at is not null limit p_batch);
  return total;
end $$;

-- Fachadas expostas são SECURITY INVOKER. Toda elevação fica no schema privado.
create function public.ag_create_workspace(p_name text,p_slug text) returns uuid language sql security invoker set search_path='' as $$select private.ag_create_workspace(p_name,p_slug)$$;
create function public.ag_change_member_role(p_workspace uuid,p_user uuid,p_role public.workspace_role) returns void language sql security invoker set search_path='' as $$select private.ag_change_member_role(p_workspace,p_user,p_role)$$;
create function public.ag_transfer_ownership(p_workspace uuid,p_user uuid) returns void language sql security invoker set search_path='' as $$select private.ag_transfer_ownership(p_workspace,p_user)$$;
create function public.ag_remove_member(p_workspace uuid,p_user uuid) returns void language sql security invoker set search_path='' as $$select private.ag_remove_member(p_workspace,p_user)$$;
create function public.ag_create_invitation(p_workspace uuid,p_email text,p_role public.workspace_role default 'member') returns text language sql security invoker set search_path='' as $$select private.ag_create_invitation(p_workspace,p_email,p_role)$$;
create function public.ag_accept_invitation(p_token text) returns uuid language sql security invoker set search_path='' as $$select private.ag_accept_invitation(p_token)$$;
create function public.ag_revoke_invitation(p_workspace uuid,p_invitation uuid) returns void language sql security invoker set search_path='' as $$select private.ag_revoke_invitation(p_workspace,p_invitation)$$;
create function public.ag_reserve_usage(p_workspace uuid,p_resource public.job_kind,p_units integer,p_idempotency_key text) returns uuid language sql security invoker set search_path='' as $$select private.ag_reserve_usage(p_workspace,p_resource,p_units,p_idempotency_key)$$;
create function public.ag_settle_usage(p_reservation uuid,p_state public.reservation_state,p_actual_units integer default null) returns void language sql security invoker set search_path='' as $$select private.ag_settle_usage(p_reservation,p_state,p_actual_units)$$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname like 'ag_%' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.signature);
  end loop;
end $$;
grant execute on function private.ag_has_role(uuid,public.workspace_role[]),private.ag_shares_workspace(uuid),private.ag_policy_allows(uuid,uuid,text,boolean) to authenticated;

grant execute on function private.ag_create_workspace(text,text),public.ag_create_workspace(text,text),
  private.ag_change_member_role(uuid,uuid,public.workspace_role),public.ag_change_member_role(uuid,uuid,public.workspace_role),
  private.ag_transfer_ownership(uuid,uuid),public.ag_transfer_ownership(uuid,uuid),
  private.ag_remove_member(uuid,uuid),public.ag_remove_member(uuid,uuid),
  private.ag_create_invitation(uuid,text,public.workspace_role),public.ag_create_invitation(uuid,text,public.workspace_role),
  private.ag_accept_invitation(text),public.ag_accept_invitation(text),
  private.ag_revoke_invitation(uuid,uuid),public.ag_revoke_invitation(uuid,uuid),
  private.ag_reserve_usage(uuid,public.job_kind,integer,text),public.ag_reserve_usage(uuid,public.job_kind,integer,text)
to authenticated;
grant execute on function private.ag_provision_workspace(uuid,uuid),private.ag_allow_workspace_creation(uuid,boolean),
  private.ag_settle_usage(uuid,public.reservation_state,integer),public.ag_settle_usage(uuid,public.reservation_state,integer),private.ag_purge_expired_data(integer)
to service_role;

commit;
