begin;

-- Identificador público estável, não é segredo nem conta de demonstração.
-- Nenhum usuário pode assumir este workspace sem provisionamento administrativo explícito.
insert into public.workspaces(id,name,slug)
values('00000000-0000-4000-8000-000000000001','AG Soluções Digitais','ag-solucoes-digitais');
select private.ag_initialize_reference_policy('00000000-0000-4000-8000-000000000001');

comment on table public.leads is 'Campos próprios do CRM. Não copiar automaticamente conteúdo de Places. Proveniência por campo em crm_field_provenance.';
comment on table public.lead_external_references is 'Apenas identificadores licenciados; Google Places limitado a place_id. Não armazena payloads de resposta.';
comment on table public.data_usage_policies is 'Permissões conservadoras aprovadas por operador; registro de política não substitui termos do provedor.';
comment on table public.ai_generations is 'Somente insumos autorizados. Não contém prompts brutos; source identifica a origem dos insumos, output é geração OpenAI permitida.';
comment on table public.search_history is 'Parâmetros fornecidos pelo usuário e telemetria operacional própria; sem resultados, avaliações, fotos ou conteúdo de respostas Google.';
comment on table public.admin_audit_events is 'Append-only para usuários e operadores da aplicação. Sem valores alterados, tokens ou conteúdo sensível. Operador SQL superusuário é fronteira de confiança.';

commit;
