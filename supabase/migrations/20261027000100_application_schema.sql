begin;

create schema if not exists private;
revoke all on schema private from public, anon;
revoke create on schema public from public, anon, authenticated;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.workspace_state as enum ('pending_owner', 'active');
create type public.lead_stage as enum ('new', 'qualified', 'contacted', 'proposal', 'won', 'lost');
create type public.data_source as enum ('user_input', 'first_party', 'authorized_import', 'google_places', 'pagespeed', 'openai');
create type public.persistence_rule as enum ('blocked', 'identifier_only', 'time_limited');
create type public.operation_state as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.job_kind as enum ('company_search', 'website_audit', 'ai_generation', 'export');
create type public.reservation_state as enum ('reserved', 'committed', 'released', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuário' check (length(btrim(display_name)) between 1 and 100),
  locale text not null default 'pt-BR' check (locale in ('pt-BR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 80),
  state public.workspace_state not null default 'pending_owner',
  owner_id uuid references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'active') = (owner_id is not null))
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create unique index workspace_one_owner on public.workspace_members(workspace_id) where role = 'owner';
create index workspace_members_user_scope on public.workspace_members(user_id, workspace_id) include (role);
alter table public.workspaces add constraint workspace_owner_membership
  foreign key (id, owner_id) references public.workspace_members(workspace_id, user_id)
  deferrable initially deferred;

create table private.workspace_creation_grants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email) <= 254),
  role public.workspace_role not null check (role <> 'owner'),
  expires_at timestamptz not null default now() + interval '72 hours',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (expires_at > created_at and expires_at <= created_at + interval '7 days'),
  check ((accepted_at is null) = (accepted_by is null)),
  check (not (accepted_at is not null and revoked_at is not null))
);
create unique index workspace_pending_invitation on public.workspace_invitations(workspace_id, email)
  where accepted_at is null and revoked_at is null;
create index workspace_invitation_expiry on public.workspace_invitations(workspace_id, expires_at);
create table private.invitation_tokens (
  invitation_id uuid primary key references public.workspace_invitations(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$')
);

-- Registro de decisões de uso. Somente operadores confiáveis podem aprovar permissões.
create table public.data_usage_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  source public.data_source not null,
  purpose text not null check (purpose in ('prospecting', 'crm', 'website_audit', 'ai_draft')),
  version integer not null check (version > 0),
  persistence public.persistence_rule not null default 'blocked',
  allowed_fields text[] not null default '{}' check (cardinality(allowed_fields) <= 30),
  allows_export boolean not null default false,
  allows_ai boolean not null default false,
  retention_days integer check (retention_days between 1 and 3650),
  rules_url text not null check (rules_url ~ '^https://[^[:space:]]+$' and length(rules_url) <= 2048),
  reviewed_at timestamptz not null,
  valid_until timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, source, purpose, version),
  check (valid_until is null or valid_until > reviewed_at),
  check (persistence <> 'time_limited' or retention_days is not null),
  check (not allows_ai or (persistence = 'time_limited' and source <> 'google_places' and purpose = 'ai_draft')),
  check (source <> 'google_places' or (persistence in ('blocked', 'identifier_only') and allowed_fields <@ array['place_id']::text[] and not allows_ai and not allows_export and retention_days is null))
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 200),
  category text check (length(category) <= 100),
  contact_name text check (length(contact_name) <= 150),
  contact_email text check (length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  contact_phone text check (length(contact_phone) <= 40),
  website_url text check (length(website_url) <= 2048 and website_url ~ '^https?://[^[:space:]]+$'),
  address text check (length(address) <= 500),
  city text check (length(city) <= 120),
  stage public.lead_stage not null default 'new',
  assigned_to uuid,
  archived_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, assigned_to) references public.workspace_members(workspace_id, user_id) on delete restrict
);
create index leads_workspace_stage on public.leads(workspace_id, stage, updated_at desc);
create index leads_workspace_assignee on public.leads(workspace_id, assigned_to);
create index leads_workspace_name on public.leads(workspace_id, lower(name));

-- Somente identificadores externos; não há payload, avaliação, foto, telefone ou nome do Google.
create table public.lead_external_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  lead_id uuid not null,
  provider public.data_source not null check (provider in ('google_places', 'first_party', 'authorized_import')),
  external_id text not null check (length(external_id) between 1 and 512 and external_id !~ '[[:space:]]'),
  place_id text generated always as (case when provider = 'google_places' then external_id end) stored,
  policy_id uuid not null,
  purpose text not null default 'prospecting' check (purpose = 'prospecting'),
  persistence public.persistence_rule not null default 'identifier_only' check (persistence = 'identifier_only'),
  observed_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, provider, external_id),
  unique (workspace_id, lead_id, id),
  unique (workspace_id, lead_id, provider),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  foreign key (workspace_id, policy_id) references public.data_usage_policies(workspace_id, id) on delete restrict
);
create unique index leads_workspace_place_id on public.lead_external_references(workspace_id, place_id) where place_id is not null;

create table public.crm_field_provenance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  lead_id uuid not null,
  field_name text not null check (field_name in ('name', 'category', 'contact_name', 'contact_email', 'contact_phone', 'website_url', 'address', 'city')),
  source public.data_source not null check (source in ('user_input', 'first_party', 'authorized_import')),
  purpose text not null default 'crm' check (purpose = 'crm'),
  external_reference_id uuid,
  policy_id uuid,
  recorded_by uuid references public.profiles(id) on delete restrict,
  recorded_via text not null check (recorded_via in ('authenticated_user','trusted_operator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  foreign key (workspace_id, lead_id, external_reference_id) references public.lead_external_references(workspace_id, lead_id, id) on delete restrict,
  foreign key (workspace_id, policy_id) references public.data_usage_policies(workspace_id, id) on delete restrict,
  check (source = 'user_input' or policy_id is not null),
  check ((recorded_via = 'authenticated_user') = (recorded_by is not null))
);
create index crm_provenance_field on public.crm_field_provenance(workspace_id, lead_id, field_name, created_at desc);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 10000),
  source public.data_source not null default 'user_input' check (source = 'user_input'),
  purpose text not null default 'crm' check (purpose = 'crm'),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade
);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null,
  kind text not null check (kind in ('call', 'meeting', 'message_draft', 'follow_up', 'other')),
  summary text not null check (length(btrim(summary)) between 1 and 1000),
  occurred_at timestamptz not null default now(),
  source public.data_source not null default 'user_input' check (source = 'user_input'),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade
);

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text check (length(description) <= 5000),
  assigned_to uuid,
  due_at timestamptz,
  completed_at timestamptz,
  source public.data_source not null default 'user_input' check (source = 'user_input'),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  foreign key (workspace_id, assigned_to) references public.workspace_members(workspace_id, user_id) on delete restrict
);
create index tasks_due_assignee on public.crm_tasks(workspace_id, assigned_to, due_at) where completed_at is null;

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null,
  from_stage public.lead_stage, to_stage public.lead_stage not null,
  changed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  check (from_stage is distinct from to_stage)
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  body text not null check (length(btrim(body)) between 1 and 10000),
  tone text not null default 'professional' check (tone in ('professional', 'consultative', 'direct')),
  source public.data_source not null default 'user_input' check (source = 'user_input'),
  archived_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, id)
);
create unique index templates_workspace_name on public.message_templates(workspace_id, lower(name)) where archived_at is null;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 150),
  description text check (length(description) <= 5000),
  template_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, id),
  foreign key (workspace_id, template_id) references public.message_templates(workspace_id, id) on delete restrict
);
create unique index campaigns_workspace_name on public.campaigns(workspace_id, lower(name)) where status <> 'archived';
create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, campaign_id uuid not null, lead_id uuid not null,
  status text not null default 'planned' check (status in ('planned', 'contacted', 'responded', 'removed')),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, campaign_id, lead_id),
  foreign key (workspace_id, campaign_id) references public.campaigns(workspace_id, id) on delete cascade,
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade
);
create index campaign_leads_lead on public.campaign_leads(workspace_id, lead_id);

create table public.search_history (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete restrict,
  mode text not null check (mode in ('free', 'category', 'keyword')),
  location_input text not null check (length(btrim(location_input)) between 1 and 200),
  keyword_input text check (length(keyword_input) <= 100),
  category_input text check (length(category_input) <= 100),
  radius_meters integer check (radius_meters in (10000, 25000, 50000)),
  source public.data_source not null default 'user_input' check (source = 'user_input'),
  provider public.data_source not null default 'google_places' check (provider = 'google_places'),
  purpose text not null default 'prospecting' check (purpose = 'prospecting'),
  state public.operation_state not null default 'queued',
  duration_ms integer check (duration_ms >= 0),
  error_code text check (error_code in ('provider_unavailable', 'rate_limited', 'invalid_request', 'unauthorized', 'internal_error')),
  completed_at timestamptz,
  retention_until timestamptz not null default now() + interval '30 days',
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, id),
  check (retention_until > created_at and retention_until <= created_at + interval '30 days'),
  check (state not in ('completed','failed','cancelled') or completed_at is not null)
);

create table public.async_jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete restrict,
  kind public.job_kind not null, state public.operation_state not null default 'queued',
  lead_id uuid, search_id uuid, template_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  available_at timestamptz not null default now(), lease_until timestamptz,
  worker_id text check (length(worker_id) between 1 and 100),
  error_code text check (error_code in ('provider_unavailable', 'rate_limited', 'invalid_request', 'unauthorized', 'internal_error')),
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id), unique (workspace_id, kind, idempotency_key),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete restrict,
  foreign key (workspace_id, search_id) references public.search_history(workspace_id, id) on delete restrict,
  foreign key (workspace_id, template_id) references public.message_templates(workspace_id, id) on delete restrict,
  check (attempts <= max_attempts),
  check ((state = 'running' and lease_until is not null and worker_id is not null)
    or (state <> 'running' and lease_until is null and worker_id is null)),
  check ((state in ('completed','failed','cancelled')) = (completed_at is not null))
);
create index jobs_ready on public.async_jobs(state, available_at) where state = 'queued';
create index jobs_workspace_creator on public.async_jobs(workspace_id, created_by, created_at desc);

create table public.website_audits (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null, job_id uuid,
  policy_id uuid not null,
  source public.data_source not null default 'pagespeed' check (source = 'pagespeed'),
  purpose text not null default 'website_audit' check (purpose = 'website_audit'),
  target_url text not null check (length(target_url) <= 2048 and target_url ~ '^https?://[^[:space:]]+$'),
  strategy text not null check (strategy in ('mobile', 'desktop')),
  state public.operation_state not null default 'queued',
  performance_score smallint check (performance_score between 0 and 100),
  lcp_ms numeric check (lcp_ms >= 0), cls numeric check (cls >= 0), inp_ms numeric check (inp_ms >= 0),
  measured_at timestamptz,
  retention_until timestamptz not null,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, id),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  foreign key (workspace_id, job_id) references public.async_jobs(workspace_id, id) on delete restrict,
  foreign key (workspace_id, policy_id) references public.data_usage_policies(workspace_id, id) on delete restrict,
  check (state <> 'completed' or measured_at is not null),
  check (state = 'completed' or (performance_score is null and lcp_ms is null and cls is null and inp_ms is null))
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid, template_id uuid, job_id uuid,
  policy_id uuid not null,
  source public.data_source not null check (source in ('user_input', 'first_party', 'authorized_import')),
  purpose text not null default 'ai_draft' check (purpose = 'ai_draft'),
  model text not null check (length(model) between 1 and 200),
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  state public.operation_state not null default 'queued',
  output_text text check (length(output_text) <= 20000),
  input_tokens integer check (input_tokens >= 0), output_tokens integer check (output_tokens >= 0),
  completed_at timestamptz, retention_until timestamptz not null,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, id),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  foreign key (workspace_id, template_id) references public.message_templates(workspace_id, id) on delete restrict,
  foreign key (workspace_id, job_id) references public.async_jobs(workspace_id, id) on delete restrict,
  foreign key (workspace_id, policy_id) references public.data_usage_policies(workspace_id, id) on delete restrict,
  check (state <> 'completed' or (completed_at is not null and output_text is not null)),
  check (state = 'completed' or output_text is null)
);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete restrict,
  resource public.job_kind not null,
  period_start date not null, period_end date not null,
  unit_limit integer not null check (unit_limit between 0 and 1000000000),
  used_units integer not null default 0 check (used_units >= 0),
  reserved_units integer not null default 0 check (reserved_units >= 0),
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, id, resource), unique (workspace_id, resource, period_start),
  check (extract(day from period_start) = 1 and period_end = (period_start + interval '1 month')::date),
  check (used_units + reserved_units <= unit_limit)
);
create table public.usage_reservations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, counter_id uuid not null,
  resource public.job_kind not null, job_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  units integer not null check (units between 1 and 100),
  actual_units integer check (actual_units >= 0 and actual_units <= units),
  state public.reservation_state not null default 'reserved',
  expires_at timestamptz not null default now() + interval '15 minutes', settled_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, resource, idempotency_key), unique (workspace_id, job_id),
  foreign key (workspace_id, counter_id, resource) references public.usage_counters(workspace_id, id, resource) on delete restrict,
  foreign key (workspace_id, job_id) references public.async_jobs(workspace_id, id) on delete restrict,
  check (expires_at > created_at and expires_at <= created_at + interval '1 hour'),
  check ((state = 'reserved') = (settled_at is null)),
  check ((state = 'committed') = (actual_units is not null))
);
create index reservations_expiry on public.usage_reservations(expires_at) where state = 'reserved';

-- Metadados administrativos, sem conteúdo de notas, prompts, chaves ou tokens.
create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  action text not null check (action in ('insert', 'update', 'delete', 'workspace_provisioned', 'ownership_transferred', 'invitation_created', 'invitation_accepted', 'invitation_revoked', 'usage_reserved', 'usage_settled')),
  entity_table text not null check (length(entity_table) <= 80),
  entity_id uuid,
  changed_columns text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Índices de escopo e RLS em TODAS as tabelas públicas criadas nesta migração.
do $$
declare t text;
begin
  foreach t in array array['profiles','workspaces','workspace_members','workspace_invitations','data_usage_policies','leads','lead_external_references','crm_field_provenance','lead_notes','lead_activities','crm_tasks','lead_stage_history','message_templates','campaigns','campaign_leads','search_history','async_jobs','website_audits','ai_generations','usage_counters','usage_reservations','admin_audit_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    if t not in ('profiles','workspaces','workspace_members') then
      execute format('create index %I on public.%I (workspace_id, created_at desc)', t || '_workspace_time', t);
    end if;
  end loop;
end $$;
alter table private.workspace_creation_grants enable row level security;
alter table private.invitation_tokens enable row level security;
revoke all on private.workspace_creation_grants, private.invitation_tokens from public, anon, authenticated;

commit;
