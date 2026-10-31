begin;

create index invitations_confirmed_recipient on public.workspace_invitations(email,expires_at)
  where accepted_at is null and revoked_at is null;

-- Um destinatário só descobre convites após provar sua identidade pelo Auth.
-- E-mail vem de auth.users confirmado, nunca de metadata ou parâmetros do cliente.
create function private.ag_list_my_invitations() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'workspace_id',i.workspace_id,
    'workspace_name',w.name,'role',i.role,'expires_at',i.expires_at) order by i.created_at),'[]'::jsonb)
  from public.workspace_invitations i
  join public.workspaces w on w.id=i.workspace_id and w.state='active'
  join auth.users u on u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=i.email
  where i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
    and not exists(select 1 from public.workspace_members m where m.workspace_id=i.workspace_id and m.user_id=u.id);
$$;

create function private.ag_accept_invitation_by_id(p_invitation uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare invite public.workspace_invitations%rowtype; verified_email text; target_workspace uuid;
begin
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if verified_email is null then raise exception using errcode='42501',message='Convite inválido ou expirado.'; end if;
  select workspace_id into target_workspace from public.workspace_invitations where id=p_invitation and email=verified_email;
  if target_workspace is null then raise exception using errcode='42501',message='Convite inválido ou expirado.'; end if;
  -- Mesma ordem de bloqueios das operações administrativas.
  perform 1 from public.workspaces where id=target_workspace and state='active' for update;
  if not found then raise exception using errcode='42501',message='Convite inválido ou expirado.'; end if;
  select * into invite from public.workspace_invitations where id=p_invitation for update;
  if not found or invite.email<>verified_email or invite.expires_at<=now() or invite.revoked_at is not null or invite.accepted_at is not null then
    raise exception using errcode='42501',message='Convite inválido ou expirado.';
  end if;
  if exists(select 1 from public.workspace_members where workspace_id=invite.workspace_id and user_id=auth.uid()) then
    raise exception using errcode='22023',message='Usuário já pertence ao workspace; convite não altera papéis existentes.';
  end if;
  insert into public.workspace_members(workspace_id,user_id,role,created_by) values(invite.workspace_id,auth.uid(),invite.role,auth.uid());
  update public.workspace_invitations set accepted_at=now(),accepted_by=auth.uid() where id=invite.id;
  delete from private.invitation_tokens where invitation_id=invite.id;
  perform private.ag_emit_audit(invite.workspace_id,'invitation_accepted','workspace_invitations',invite.id,array['accepted_at','accepted_by']);
  return invite.workspace_id;
end $$;

create function public.ag_list_my_invitations() returns jsonb language sql security invoker set search_path='' as $$select private.ag_list_my_invitations()$$;
create function public.ag_accept_invitation_by_id(p_invitation uuid) returns uuid language sql security invoker set search_path='' as $$select private.ag_accept_invitation_by_id(p_invitation)$$;
revoke all on function private.ag_list_my_invitations(),public.ag_list_my_invitations(),private.ag_accept_invitation_by_id(uuid),public.ag_accept_invitation_by_id(uuid) from public,anon,authenticated,service_role;
grant execute on function private.ag_list_my_invitations(),public.ag_list_my_invitations(),private.ag_accept_invitation_by_id(uuid),public.ag_accept_invitation_by_id(uuid) to authenticated;

commit;
