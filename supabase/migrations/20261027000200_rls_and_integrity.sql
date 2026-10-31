begin;

-- Helpers ficam fora dos schemas expostos e consultam associação atual, nunca papéis do JWT.
create function private.ag_has_role(p_workspace uuid, p_roles public.workspace_role[] default array['owner','admin','member']::public.workspace_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace and m.user_id = auth.uid() and m.role = any(p_roles) and w.state = 'active'
  );
$$;

create function private.ag_shares_workspace(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.workspace_members a join public.workspace_members b on b.workspace_id = a.workspace_id
    join public.workspaces w on w.id = a.workspace_id
    where a.user_id = auth.uid() and b.user_id = p_user and w.state = 'active'
  );
$$;

create function private.ag_policy_allows(p_workspace uuid, p_policy uuid, p_purpose text, p_ai boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.data_usage_policies p
    where p.workspace_id = p_workspace and p.id = p_policy and p.purpose = p_purpose
      and p.source <> 'google_places' and p.persistence = 'time_limited'
      and p.reviewed_at <= now() and (p.valid_until is null or p.valid_until > now())
      and (not p_ai or p.allows_ai));
$$;

create function private.ag_guard_record() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new)->'id') is distinct from (to_jsonb(old)->'id')
      or (to_jsonb(new)->'workspace_id') is distinct from (to_jsonb(old)->'workspace_id')
      or (to_jsonb(new)->'created_at') is distinct from (to_jsonb(old)->'created_at')
      or (to_jsonb(new)->'created_by') is distinct from (to_jsonb(old)->'created_by') then
      raise exception using errcode = '42501', message = 'Identidade, workspace e autoria de criação são imutáveis.';
    end if;
  elsif to_jsonb(new) ? 'created_by' and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create function private.ag_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values(new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), 'Usuário'), 100))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger ag_auth_profile after insert on auth.users for each row execute function private.ag_create_profile();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

create function private.ag_emit_audit(p_workspace uuid, p_action text, p_table text, p_entity uuid, p_columns text[] default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_audit_events(workspace_id, actor_id, action, entity_table, entity_id, changed_columns)
  values(p_workspace, auth.uid(), p_action, p_table, p_entity, p_columns);
$$;

create function private.ag_admin_change_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare record_data jsonb; scope_id uuid; resource_id uuid; columns_changed text[] := '{}'; k text;
begin
  record_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  scope_id := case when tg_table_name = 'workspaces' then (record_data->>'id')::uuid else (record_data->>'workspace_id')::uuid end;
  resource_id := coalesce(record_data->>'id', record_data->>'user_id')::uuid;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if k <> 'updated_at' and to_jsonb(new)->k is distinct from to_jsonb(old)->k then columns_changed := array_append(columns_changed, k); end if;
    end loop;
    if cardinality(columns_changed) = 0 then return new; end if;
  end if;
  perform private.ag_emit_audit(scope_id, lower(tg_op), tg_table_name, resource_id, columns_changed);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create function private.ag_record_lead_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare f text;
begin
  foreach f in array array['name','category','contact_name','contact_email','contact_phone','website_url','address','city'] loop
    if (tg_op = 'INSERT' and to_jsonb(new)->>f is not null)
      or (tg_op = 'UPDATE' and to_jsonb(new)->f is distinct from to_jsonb(old)->f) then
      insert into public.crm_field_provenance(workspace_id, lead_id, field_name, source, recorded_by,recorded_via)
      values(new.workspace_id, new.id, f, 'user_input', auth.uid(),case when auth.uid() is null then 'trusted_operator' else 'authenticated_user' end);
    end if;
  end loop;
  if tg_op = 'INSERT' then
    insert into public.lead_stage_history(workspace_id, lead_id, to_stage, changed_by) values(new.workspace_id, new.id, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into public.lead_stage_history(workspace_id, lead_id, from_stage, to_stage, changed_by)
    values(new.workspace_id, new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end $$;
create trigger ag_lead_changes after insert or update on public.leads for each row execute function private.ag_record_lead_changes();

create function private.ag_validate_reference() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.data_usage_policies%rowtype;
begin
  select * into p from public.data_usage_policies where workspace_id = new.workspace_id and id = new.policy_id;
  if not found or p.source <> new.provider or p.purpose <> new.purpose or p.persistence <> 'identifier_only'
    or p.reviewed_at > now() or (p.valid_until is not null and p.valid_until <= now())
    or (new.provider = 'google_places' and not ('place_id' = any(p.allowed_fields))) then
    raise exception using errcode = '23514', message = 'Política não permite persistir esta referência externa.';
  end if;
  return new;
end $$;
create trigger ag_reference_policy before insert or update on public.lead_external_references for each row execute function private.ag_validate_reference();

create function private.ag_validate_artifact() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.data_usage_policies%rowtype; field_name text;
begin
  select * into p from public.data_usage_policies where workspace_id = new.workspace_id and id = new.policy_id;
  if not found or p.source <> new.source
    or not private.ag_policy_allows(new.workspace_id, new.policy_id, new.purpose, tg_table_name = 'ai_generations') then
    raise exception using errcode = '23514', message = 'Persistência/processamento não autorizado pela política da fonte.';
  end if;
  if new.retention_until <= now() or new.retention_until > new.created_at + make_interval(days => p.retention_days)
    or (p.valid_until is not null and new.retention_until > p.valid_until) then
    raise exception using errcode = '23514', message = 'Prazo de persistência excede a política aprovada.';
  end if;
  foreach field_name in array case when tg_table_name = 'ai_generations'
    then array['output_text'] else array['performance_score','lcp_ms','cls','inp_ms'] end loop
    if to_jsonb(new)->>field_name is not null and not (field_name = any(p.allowed_fields)) then
      raise exception using errcode = '23514', message = 'Campo não permitido pela política de persistência.';
    end if;
  end loop;
  return new;
end $$;
create trigger ag_audit_policy before insert or update on public.website_audits for each row execute function private.ag_validate_artifact();
create trigger ag_ai_policy before insert or update on public.ai_generations for each row execute function private.ag_validate_artifact();

-- Integridade de proprietário também é conferida ao fim da transação.
create function private.ag_check_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare scope_id uuid; w public.workspaces%rowtype;
begin
  scope_id := (coalesce(to_jsonb(new),to_jsonb(old))->>(case when tg_table_name='workspaces' then 'id' else 'workspace_id' end))::uuid;
  select * into w from public.workspaces where id = scope_id;
  if found and w.state = 'active' and not exists (
    select 1 from public.workspace_members where workspace_id = w.id and user_id = w.owner_id and role = 'owner'
  ) then raise exception using errcode = '23514', message = 'Workspace ativo deve manter seu proprietário.'; end if;
  return null;
end $$;
create constraint trigger ag_owner_workspace after insert or update on public.workspaces deferrable initially deferred for each row execute function private.ag_check_owner();
create constraint trigger ag_owner_membership after insert or update or delete on public.workspace_members deferrable initially deferred for each row execute function private.ag_check_owner();

do $$
declare t text;
begin
  foreach t in array array['profiles','workspaces','workspace_members','workspace_invitations','data_usage_policies','leads','lead_external_references','crm_field_provenance','lead_notes','lead_activities','crm_tasks','lead_stage_history','message_templates','campaigns','campaign_leads','search_history','async_jobs','website_audits','ai_generations','usage_counters','usage_reservations','admin_audit_events'] loop
    execute format('create trigger ag_guard before insert or update on public.%I for each row execute function private.ag_guard_record()', t);
  end loop;
  foreach t in array array['workspaces','workspace_members','workspace_invitations','data_usage_policies','usage_counters','usage_reservations','website_audits','ai_generations','async_jobs'] loop
    execute format('create trigger ag_admin_audit after insert or update or delete on public.%I for each row execute function private.ag_admin_change_audit()', t);
  end loop;
end $$;

-- Leituras: sempre por associação atual. Não há grants anônimos.
grant usage on schema private to authenticated, service_role;
-- A chave de serviço não pode reescrever a trilha de auditoria por DML direto.
revoke all on public.admin_audit_events from service_role;
grant select on public.admin_audit_events to service_role;
grant select on public.profiles, public.workspaces, public.workspace_members, public.data_usage_policies,
  public.leads, public.lead_external_references, public.crm_field_provenance, public.lead_notes,
  public.lead_activities, public.crm_tasks, public.lead_stage_history, public.message_templates,
  public.campaigns, public.campaign_leads, public.search_history, public.async_jobs,
  public.website_audits, public.ai_generations, public.usage_counters, public.usage_reservations,
  public.workspace_invitations, public.admin_audit_events to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or private.ag_shares_workspace(id));
create policy profiles_edit on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant update (display_name, locale) on public.profiles to authenticated;
create policy workspaces_read on public.workspaces for select to authenticated using (private.ag_has_role(id));
create policy workspaces_edit on public.workspaces for update to authenticated
  using (private.ag_has_role(id, array['owner','admin']::public.workspace_role[]))
  with check (private.ag_has_role(id, array['owner','admin']::public.workspace_role[]));
grant update (name) on public.workspaces to authenticated;
create policy members_read on public.workspace_members for select to authenticated using (private.ag_has_role(workspace_id));

do $$
declare t text;
begin
  foreach t in array array['data_usage_policies','leads','lead_external_references','crm_field_provenance','lead_notes','lead_activities','crm_tasks','lead_stage_history','message_templates','campaigns','campaign_leads','usage_counters'] loop
    execute format('create policy scope_read on public.%I for select to authenticated using (private.ag_has_role(workspace_id))', t);
  end loop;
  foreach t in array array['workspace_invitations','admin_audit_events'] loop
    execute format('create policy administrators_read on public.%I for select to authenticated using (private.ag_has_role(workspace_id, array[''owner'',''admin'']::public.workspace_role[]))', t);
  end loop;
  foreach t in array array['async_jobs','usage_reservations'] loop
    execute format('create policy requester_read on public.%I for select to authenticated using (private.ag_has_role(workspace_id) and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array[''owner'',''admin'']::public.workspace_role[])))', t);
  end loop;
end $$;
create policy history_read on public.search_history for select to authenticated using (
  retention_until > now() and private.ag_has_role(workspace_id)
  and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])));
create policy audit_read on public.website_audits for select to authenticated using (
  retention_until > now() and private.ag_has_role(workspace_id) and private.ag_policy_allows(workspace_id, policy_id, purpose));
create policy ai_read on public.ai_generations for select to authenticated using (
  retention_until > now() and private.ag_has_role(workspace_id) and private.ag_policy_allows(workspace_id, policy_id, purpose, true)
  and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])));

-- Escritas comuns usam JWT do usuário + RLS, sem chave privilegiada.
create policy leads_add on public.leads for insert to authenticated with check (private.ag_has_role(workspace_id) and created_by = (select auth.uid()));
create policy leads_edit on public.leads for update to authenticated using (private.ag_has_role(workspace_id)) with check (private.ag_has_role(workspace_id));
create policy leads_delete on public.leads for delete to authenticated using (private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[]));
grant insert (workspace_id,name,category,contact_name,contact_email,contact_phone,website_url,address,city,stage,assigned_to,archived_at) on public.leads to authenticated;
grant update (name,category,contact_name,contact_email,contact_phone,website_url,address,city,stage,assigned_to,archived_at), delete on public.leads to authenticated;

create policy references_add on public.lead_external_references for insert to authenticated with check (private.ag_has_role(workspace_id) and created_by = (select auth.uid()));
create policy references_delete on public.lead_external_references for delete to authenticated using (private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[]));
grant insert (workspace_id,lead_id,provider,external_id,policy_id), delete on public.lead_external_references to authenticated;

create policy notes_add on public.lead_notes for insert to authenticated with check (private.ag_has_role(workspace_id) and created_by = (select auth.uid()));
create policy notes_edit on public.lead_notes for update to authenticated
  using (private.ag_has_role(workspace_id) and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])))
  with check (private.ag_has_role(workspace_id) and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])));
create policy notes_delete on public.lead_notes for delete to authenticated using (private.ag_has_role(workspace_id) and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])));
grant insert (workspace_id,lead_id,body), update (body), delete on public.lead_notes to authenticated;

create policy activities_add on public.lead_activities for insert to authenticated with check (private.ag_has_role(workspace_id) and created_by = (select auth.uid()));
grant insert (workspace_id,lead_id,kind,summary,occurred_at) on public.lead_activities to authenticated;

create policy tasks_add on public.crm_tasks for insert to authenticated with check (private.ag_has_role(workspace_id) and created_by = (select auth.uid()));
create policy tasks_edit on public.crm_tasks for update to authenticated
  using (private.ag_has_role(workspace_id) and (created_by = (select auth.uid()) or assigned_to = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])))
  with check (private.ag_has_role(workspace_id));
create policy tasks_delete on public.crm_tasks for delete to authenticated using (private.ag_has_role(workspace_id) and (created_by = (select auth.uid()) or private.ag_has_role(workspace_id, array['owner','admin']::public.workspace_role[])));
grant insert (workspace_id,lead_id,title,description,assigned_to,due_at), update (title,description,assigned_to,due_at,completed_at), delete on public.crm_tasks to authenticated;

do $$
declare t text;
begin
  foreach t in array array['message_templates','campaigns','campaign_leads'] loop
    execute format('create policy administrators_add on public.%I for insert to authenticated with check (private.ag_has_role(workspace_id, array[''owner'',''admin'']::public.workspace_role[]) and created_by = (select auth.uid()))', t);
    execute format('create policy administrators_edit on public.%I for update to authenticated using (private.ag_has_role(workspace_id, array[''owner'',''admin'']::public.workspace_role[])) with check (private.ag_has_role(workspace_id, array[''owner'',''admin'']::public.workspace_role[]))', t);
    execute format('create policy administrators_delete on public.%I for delete to authenticated using (private.ag_has_role(workspace_id, array[''owner'',''admin'']::public.workspace_role[]))', t);
  end loop;
end $$;
grant insert (workspace_id,name,body,tone,archived_at), update (name,body,tone,archived_at), delete on public.message_templates to authenticated;
grant insert (workspace_id,name,description,template_id,status), update (name,description,template_id,status), delete on public.campaigns to authenticated;
grant insert (workspace_id,campaign_id,lead_id,status), update (status), delete on public.campaign_leads to authenticated;
create policy search_add on public.search_history for insert to authenticated with check (private.ag_has_role(workspace_id) and created_by = (select auth.uid()));
grant insert (workspace_id,mode,location_input,keyword_input,category_input,radius_meters) on public.search_history to authenticated;

-- Sem políticas de escrita = negação por padrão nas tabelas administrativas, de histórico e de processamento.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname like 'ag_%' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.signature);
  end loop;
end $$;
grant execute on function private.ag_has_role(uuid,public.workspace_role[]), private.ag_shares_workspace(uuid), private.ag_policy_allows(uuid,uuid,text,boolean) to authenticated;

commit;
