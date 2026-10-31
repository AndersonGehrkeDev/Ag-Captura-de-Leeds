begin;

-- Revisão de 27/10/2026: a exceção de cache do ID não aprova prospecção/diretório/publicidade.
-- Nenhuma licença específica do produto foi apresentada. Uma flag/env não pode liberar esta barreira.
update public.data_usage_policies set persistence='blocked',allowed_fields='{}',allows_export=false,allows_ai=false,
  retention_days=null,valid_until=null,rules_url='https://cloud.google.com/maps-platform/terms',reviewed_at=now()
where source='google_places';

alter table public.data_usage_policies add constraint google_places_product_use_not_approved
  check(source<>'google_places' or (persistence='blocked' and cardinality(allowed_fields)=0 and not allows_export and not allows_ai));

create or replace function private.ag_initialize_reference_policy(p_workspace uuid) returns void
language sql security definer set search_path='' as $$
  insert into public.data_usage_policies(workspace_id,source,purpose,version,persistence,allowed_fields,rules_url,reviewed_at)
  values(p_workspace,'google_places','prospecting',1,'blocked','{}',
    'https://cloud.google.com/maps-platform/terms',now())
  on conflict(workspace_id,source,purpose,version) do nothing;
$$;

-- Registros legados não são apagados nesta revisão, mas não ficam disponíveis no produto.
alter policy scope_read on public.lead_external_references
  using(private.ag_has_role(workspace_id) and provider<>'google_places');
alter policy references_add on public.lead_external_references
  with check(private.ag_has_role(workspace_id) and created_by=(select auth.uid()) and provider<>'google_places');

comment on table public.lead_external_references is 'Identificadores próprios/licenciados. Google bloqueado para o caso de uso atual; exceção de place_id não autoriza o produto. Sem payload externo.';
comment on column public.crm_field_provenance.source is 'user_input registra o canal de entrada, não comprova propriedade/licença. Cópia manual não muda a origem; integração exige evidência e ancestralidade verificadas no servidor.';

commit;
