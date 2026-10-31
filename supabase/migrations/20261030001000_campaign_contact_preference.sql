begin;
create function private.ag_guard_campaign_contact() returns trigger language plpgsql security definer set search_path='' as $$
declare blocked boolean;
begin
  select do_not_contact into blocked from public.leads where workspace_id=new.workspace_id and id=new.lead_id for update;
  if blocked and new.status in ('planned','contacted') then raise exception using errcode='23514',message='Lead marcado como Não contatar.'; end if;
  return new;
end $$;
create trigger ag_campaign_contact_guard before insert or update on public.campaign_leads for each row execute function private.ag_guard_campaign_contact();
create function private.ag_remove_planned_contacts() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.do_not_contact and not old.do_not_contact then update public.campaign_leads set status='removed' where workspace_id=new.workspace_id and lead_id=new.id and status='planned'; end if;
  return new;
end $$;
create trigger ag_campaign_no_contact after update of do_not_contact on public.leads for each row execute function private.ag_remove_planned_contacts();
revoke all on function private.ag_guard_campaign_contact(),private.ag_remove_planned_contacts() from public,anon,authenticated,service_role;
commit;
