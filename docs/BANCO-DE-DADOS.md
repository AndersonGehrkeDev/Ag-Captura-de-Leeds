# Banco de dados — workspaces e CRM

Implementação por migrações em `supabase/migrations`, sem projeto remoto conectado. Auth/perfil/workspaces seguem [AUTENTICACAO.md](AUTENTICACAO.md); CRM/lista/Kanban e referências autorizadas seguem [CRM.md](CRM.md). Cada migração usa transação. Após a migração 010, o schema mantém **22 tabelas públicas**, 7 tabelas privadas auxiliares e RLS em todas elas. Os perfis referenciam `auth.users`; os demais dados são isolados por workspace. Auditorias e mensagens reutilizam tarefas/cotas existentes e persistem somente metadados próprios: [AUDITORIAS.md](AUDITORIAS.md), [MENSAGENS-IA.md](MENSAGENS-IA.md). Gestão de tarefas/campanhas/modelos/relatórios: [PAGINAS-DO-MENU.md](PAGINAS-DO-MENU.md).

## Migrações

| Arquivo | Responsabilidade |
| --- | --- |
| `20261027000100_application_schema.sql` | Tipos, tabelas, constraints, relações, índices, RLS habilitado e revogação inicial de acesso |
| `20261027000200_rls_and_integrity.sql` | Políticas, grants por coluna, autoria/datas imutáveis, triggers, proveniência e auditoria |
| `20261027000300_protected_operations.sql` | Operações autorizadas de workspaces, papéis, convites, reservas e limpeza de dados |
| `20261027000400_initial_ag_workspace.sql` | Workspace inicial da AG, ainda sem proprietário; comentários de finalidade e limites |
| `20261027000500_verified_email_invitations.sql` | Listagem/aceite de convites pelo destinatário autenticado com e-mail confirmado, sem token em URL/metadata |
| `20261027000600_google_product_use_gate.sql` | Bloqueio Google por caso de uso; impede novas referências e oculta legadas sem apagá-las |
| `20261028000700_durable_website_audit_jobs.sql` | Metadados privados de auditoria e hash de executor; RPC com sessão/associação e prova do backend nas mutações, reaproveitando async_jobs e cotas, sem reter relatórios PSI |
| `20261030000800_commercial_message_attempts.sql` | Hash privado de executor de IA e RPC de tentativa com sessão/associação/prova do backend, exclusão concorrente, deduplicação e cota durável; sem prompts ou respostas |
| `20261030000900_crm_workflow.sql` | Oito etapas e metadados do lead, unicidade manual, vínculos privados de referências autorizadas com prazo/ancestrais, hash de executor, RPC protegido e limpeza SQL limitada; conteúdo das fontes não é copiado |
| `20261030001000_campaign_contact_preference.sql` | Impede planejar/registrar novo contato com Não contatar e remove participações ainda planejadas quando a preferência é ativada; sem novas tabelas, disparos ou credencial privilegiada no usuário |

## Modelo

| Tabelas | Conteúdo |
| --- | --- |
| `profiles` | Nome de exibição, idioma e datas; ID vinculado ao Auth |
| `workspaces`, `workspace_members` | Organização, estado, proprietário e associação com papel `owner`, `admin` ou `member` |
| `workspace_invitations` | Destinatário, papel permitido, expiração, aceite e revogação; nenhum token em texto puro |
| `private.invitation_tokens` | Somente hash SHA-256 do token; sem leitura por usuários |
| `private.workspace_creation_grants` | Aprovação de criação de novos workspaces, administrada por operador confiável |
| `leads` | Identificação interna e metadados do CRM: modo/origem do fluxo, oito etapas, responsável, etiquetas, Não contatar, próximo contato e arquivamento; negócios externos não verificados não são promovidos |
| `lead_external_references` | Referência a fonte externa, finalidade e política; `place_id` gerado a partir do identificador Google |
| `crm_field_provenance` | Origem por campo alterado, finalidade e autor autenticado ou entrada por operador confiável; sem duplicar o valor do campo |
| `lead_notes`, `lead_activities`, `crm_tasks` | Notas, atividades e tarefas comerciais com autoria e escopo |
| `lead_stage_history` | Etapa anterior/nova e autor, gerados por trigger; sem escrita direta por usuários |
| `private.crm_executor_config`, `private.crm_source_bindings` | Hash do executor e vínculo entre workspace/lead/referência, fonte/ID nativo autorizado, IDs de proveniência/ancestrais e prazo; sem nome/site/telefone/avaliação ou payload da fonte |
| `message_templates` | Modelos próprios de mensagem, tom e arquivamento |
| `campaigns`, `campaign_leads` | Organização comercial e associação de leads; não executa disparos |
| `data_usage_policies` | Origem, finalidade, versão, campos permitidos, regra de persistência, revisão, validade, retenção, exportação e IA |
| `website_audits` | URL, estratégia, estado e métricas selecionadas do PageSpeed, inicialmente nulas; sem resposta bruta |
| `ai_generations` | Origem dos insumos permitidos, modelo, digest da requisição, texto autorizado, uso efetivo quando disponível e retenção; sem prompt bruto |
| `search_history` | Parâmetros fornecidos pelo usuário e telemetria operacional própria; sem resultados/contatos/avaliações do Google |
| `async_jobs` | Tipo, referências tipadas, idempotência, tentativas, disponibilidade e lease; sem payload JSON livre ou credenciais |
| `usage_counters`, `usage_reservations` | Limite mensal UTC, consumo, reservas, idempotência, expiração e liquidação |
| `admin_audit_events` | Metadados de mutações administrativas: ator, workspace, ação, entidade e nomes dos campos alterados |

Relações entre registros usam FKs compostas com `workspace_id`: campanha/lead/modelo, nota/lead, tarefa/responsável, job/lead/busca/modelo, auditoria/lead/job/política, geração/modelo/lead/job/política e reserva/contador/job. Uma referência de proveniência também precisa pertencer ao mesmo lead. Chaves compostas preservam o escopo mesmo quando alguém pertence a mais de um workspace.

`(workspace_id, provider, external_id)` deduplica referências próprias/licenciadas. O índice histórico de Place ID continua no schema, mas não representa permissão: a migração 006 bloqueia novas referências Google e oculta as legadas para usuários. Nomes de campanha/modelo ativos têm unicidade por workspace. Índices cobrem associação por usuário, etapas, responsáveis, tarefas pendentes, jobs disponíveis, expiração e navegação por workspace/data.

## Papéis e permissões

Todos os papéis abaixo são **papéis de aplicação no workspace**, não papéis SQL privilegiados. A associação é consultada no banco a cada operação; um campo `role` ou `workspace_role` no metadata/JWT não concede poderes.

| Recurso/operação | member | admin | owner |
| --- | --- | --- | --- |
| Consultar workspace e membros | Próprio workspace ativo | Mesmo | Mesmo |
| Alterar nome do workspace | Não | Sim | Sim |
| Criar/editar leads | Sim, dentro do workspace | Sim | Sim |
| Excluir leads | Não | Sim, respeitando FKs | Sim, respeitando FKs |
| Notas | Criar; editar/excluir as próprias | Gerenciar notas da equipe | Mesmo |
| Atividades | Ler/criar; registros append-only | Mesmo | Mesmo |
| Tarefas | Criar; editar as criadas/atribuídas a si; excluir as próprias | Gerenciar todas | Mesmo |
| Modelos/campanhas/associações | Consultar | Gerenciar | Gerenciar |
| Criar convites | Não | Somente `member` | `member` ou `admin` |
| Trocar papéis | Não | Não | Somente `member`/`admin` via RPC |
| Transferir proprietário | Não | Não | Via RPC para outro membro existente |
| Remover membros | Sair, se não for owner | Remover members; sair | Remover outros não proprietários |
| Histórico de etapas e proveniência | Consultar | Consultar | Consultar |
| Busca/jobs/reservas | Consultar os próprios | Consultar os do workspace | Mesmo |
| Auditorias autorizadas e não expiradas | Consultar no workspace | Mesmo | Mesmo |
| Gerações autorizadas e não expiradas | Consultar as próprias | Consultar as do workspace | Mesmo |
| Políticas, limites, resultados e execução de jobs | Sem escrita direta | Sem escrita direta | Sem escrita direta |
| Eventos administrativos | Não | Consultar os do workspace | Mesmo |

Perfis podem ser lidos pelo próprio usuário ou por quem compartilha um workspace ativo; somente nome/idioma próprios podem ser atualizados. Perfis são criados por trigger do Auth, sem autoassociação a workspace. E-mails pessoais do Auth não são expostos em `profiles`.

Tabelas de sistema e histórias não têm políticas/grants de escrita para `authenticated`, portanto negam a operação por padrão. Inserções comuns do CRM usam a sessão do usuário e RLS. Grants por coluna impedem fornecer ou atualizar autoria, IDs, `workspace_id` e datas de criação indevidamente; triggers reforçam a imutabilidade e atualizam `updated_at`. FKs e índices continuam valendo para operadores privilegiados.

`owner` não significa administrador da plataforma: não pode aprovar direitos de fontes, elevar limite contratado, gravar resultados de auditoria/IA nem liquidar consumo diretamente. `service_role` é uma fronteira administrativa confiável e não deve ser usada nas operações comuns. Eventos de auditoria não podem ser inseridos, alterados, excluídos ou truncados por DML direto dessa chave; são emitidos internamente. O operador SQL dono dos objetos ainda é uma fronteira de confiança, não uma trilha inviolável contra superusuário.

## Operações protegidas e funções

Os wrappers em `public.ag_*` são `SECURITY INVOKER`. A elevação necessária fica em funções `private.ag_*`, fora do schema exposto, todas com `search_path=''` e relações qualificadas. `PUBLIC` e `anon` não executam essas funções. Só os helpers booleanos necessários às políticas e operações que verificam autorização são concedidos a `authenticated`.

| Função exposta | Regra |
| --- | --- |
| `ag_create_workspace(name, slug)` | Usuário previamente aprovado em allowlist privada; torna somente a si proprietário |
| `ag_change_member_role(workspace, user, role)` | Somente owner; não cria ou remove proprietário |
| `ag_transfer_ownership(workspace, user)` | Owner atual, workspace bloqueado na transação, alvo já associado; troca atômica |
| `ag_remove_member(workspace, user)` | Regras da matriz; dono nunca removido por esta função |
| `ag_create_invitation(workspace, email, role)` | Owner/admin conforme papel permitido; retorna token uma única vez, armazenando apenas hash |
| `ag_accept_invitation(token)` | Token válido, não usado/revogado/expirado e e-mail confirmado do Auth correspondente; membro existente não é promovido por convite |
| `ag_list_my_invitations()` | Somente convites vigentes para o e-mail confirmado da própria identidade, sem associações existentes |
| `ag_accept_invitation_by_id(invitation)` | E-mail confirmado correspondente, workspace ativo, não expirado/revogado/usado; bloqueios e aceite atômicos, sem promover membro |
| `ag_revoke_invitation(workspace, invitation)` | Owner/admin, com restrição para convites de admin |
| `ag_reserve_usage(workspace, resource, units, key)` | Associação atual, unidades limitadas, contador mensal existente e saldo suficiente; reserva idempotente |
| `ag_settle_usage(reservation, state, actual_units)` | Execução somente por `service_role`; usuários não podem confirmar consumo |

O helper de associação lê membros como seu dono em schema privado, evitando política recursiva. `workspaces.owner_id` aponta para associação no mesmo workspace, com FK e trigger deferidos; workspace ativo mantém exatamente um owner. Convites não podem conter papel owner. Aceite não confia em e-mail arbitrário enviado pelo cliente: consulta o Auth.

Mutações de workspace, membros, convites, políticas, contadores/reservas, artefatos e jobs geram eventos sem valores sensíveis. Falhas abortam a transação e não são registradas como sucesso. Não são armazenados tokens de convite em eventos ou mensagens de erro.

## Proveniência e licenças

`leads` guarda conteúdo próprio do CRM. Alterações de nome, categoria, contato, site, endereço e cidade criam registros de proveniência com campo, finalidade e origem da entrada. `recorded_via` distingue usuário autenticado de operação SQL confiável. Valores não são duplicados em históricos. Importações futuras precisam preservar sua origem comprovada; não é permitido disfarçar conteúdo de provedor como entrada manual para contornar licenças.

Google Places agora começa com política **blocked**, inclusive para IDs, após a revisão do caso de uso. A migração 006 substitui a anterior prontidão `identifier_only`; a exceção de cache de `place_id` não autoriza diretório/prospecção ou conteúdo derivado. Constraint impede liberar essa persistência só por DML/flag; RLS bloqueia novos IDs e oculta legados sem apagá-los. Não existem colunas de payload, fotos ou avaliações Google. Fontes, regime contratual e decisões: [integracoes.md](integracoes.md).

`crm_field_provenance.source=user_input` registra aquisição por entrada do usuário, não prova origem independente/licença. Não use esse rótulo para autorizar IA/exportação ou substituir ancestralidade Google. O contrato novo exige registros/evidências resolvidos no servidor; o repositório persistente desse manifesto e seu mapeamento SQL ainda não estão conectados.

Auditorias e gerações exigem política compatível com fonte/finalidade, vigente e com retenção limitada. Campos não aprovados são rejeitados. Gerações não aceitam fonte Google, exigem `allows_ai` e não arquivam prompts brutos. Políticas de desenvolvimento são sintéticas; não aprovam direitos em produção. Novos workspaces não recebem automaticamente aprovação para IA, PageSpeed, exportação de conteúdo ou cotas de consumo.

Conteúdo expirado/revogado deixa de ser visível pelas políticas de leitura. `private.ag_purge_expired_data(batch)` efetivamente remove artefatos vencidos/revogados e buscas expiradas, cancela jobs dependentes e libera reservas expiradas. Essa função é administrativa, limitada por lote e **ainda não possui agendamento ativo**. É necessário executá-la por operação confiável e configurar o executor na etapa própria; ocultação via RLS sozinha não equivale a exclusão física.

## Consumo e tarefas assíncronas

Limites são configurados por operador confiável em períodos mensais UTC, sem sobreposição de meses. Não há plano pago ou crédito de produção inventado. Reservar sem contador configurado falha. O usuário não fornece o limite nem confirma o consumo.

Reserva usa lock no contador antes de verificar/inserir a chave idempotente. Liquidação segue a ordem contador → reserva, reduz reservado e soma somente o consumo efetivamente informado pelo executor confiável; repetições iguais não cobram novamente. Divergências e excesso de limite falham. Expirar/liberar não inventa consumo. Concorrência de múltiplas conexões precisa ser testada em PostgreSQL/Supabase completo; o teste embarcado usa conexão exclusiva.

`async_jobs` possui estado, lease, tentativas e referências, sem segredos. Usuários não podem alterar estado/worker/tentativas diretamente. A migração não cria executor, cron, disparador ou chamada a serviços pagos.

## Desenvolvimento e implantação

```powershell
npm.cmd ci
npm.cmd run db:test
npm.cmd run db:types
npm.cmd run check
```

Esses comandos executam um PostgreSQL PGlite descartável em memória, aplicam os SQLs versionados e não conectam a banco remoto. O harness mínimo de `auth.users`/`auth.uid()` existe apenas em `scripts/db/database.mjs`, nunca nas migrações para Supabase.

Com Docker/Podman disponível, os comandos oficiais locais ficam preparados:

```powershell
npm.cmd run db:start
npm.cmd run db:reset:local
npm.cmd run db:stop
```

`db:reset:local` recria apenas o banco local e apaga seus registros; não use em dados que queira preservar. A configuração expõe somente `public`, exige grants explícitos e desativa seed automática. Não foi feito link ou push para projeto remoto.

Para um projeto real, configurar a conexão autorizada pelo CLI/Dashboard, revisar o schema/diferença e aplicar as quatro migrações pelo fluxo de migração. Não fornecer tokens, senhas ou URLs secretas pelo chat. A conta que aplica migrações é administrativa; não reutilizar sua credencial em código cliente ou operações comuns do CRM.

Configuração externa ainda necessária: referência do projeto/branch de teste (`--project-ref`), login/perfil autorizado no Supabase CLI ou conexão administrativa configurada diretamente no ambiente, e UUID do usuário real confirmado que será proprietário. Senhas devem ser fornecidas no mecanismo de credenciais/prompt local, sem argumentos registrados em histórico ou valores no Git.

Os comandos abaixo são instruções para quando houver destino e acesso disponíveis; **não foram executados** nesta entrega:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref SEU_PROJECT_REF
npx.cmd supabase db push --dry-run --skip-vault
```

Após revisar o dry-run e confirmar o destino, a aplicação efetiva usa `supabase db push --skip-vault`, sem `--include-seed`. `--skip-vault` mantém essa operação limitada às migrações, sem atualizar segredos do Vault a partir do config. Antes de integrar a interface, configurar também `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` diretamente no ambiente; nenhuma dessas configurações é necessária para os testes embarcados.

### Proprietário inicial da AG

A migração cria `AG Soluções Digitais`, slug `ag-solucoes-digitais`, ID `00000000-0000-4000-8000-000000000001`, estado `pending_owner`. Não há UUID de usuário real inventado e ninguém pode assumir esse workspace automaticamente.

Após criar/conferir o usuário real no Auth com e-mail confirmado, um operador confiável executa o modelo de `supabase/bootstrap.sql.example`, substituindo a placeholder pelo UUID correto diretamente no SQL administrativo. O provisionamento é transacional, auditado e rejeita novo provisionamento de workspace já ativo. Para criação futura de workspaces pela aplicação, o operador autoriza o usuário através de `private.ag_allow_workspace_creation`; membros não podem se autorizar.

### Seeds

`supabase/seeds/development.sql` contém somente contas `.test` sem senha/login, dois workspaces, leads e limites sintéticos. Ela exige a configuração de sessão `ag.allow_development_seed='yes-local-only'` e é desativada por padrão. Os testes definem esse opt-in em transação apenas no banco em memória. Para usar em outro banco descartável de desenvolvimento, executar conscientemente em uma transação com esse `SET LOCAL`; nunca em produção. Não basta copiar a seed para uma migração.

### Tipos TypeScript

`src/lib/supabase/database.types.ts` foi gerado por **introspecção do catálogo PostgreSQL migrado**, não por escrita manual nem pelo mockup. `scripts/db/generate-types.mjs` extrai colunas/nullabilidade/defaults, relacionamentos compostos, enums e assinaturas das funções públicas. Geração desconhecida falha em vez de usar `any`; a saída inclui hash dos SQLs. `db:types:check`, executado no check geral, detecta deriva.

O gerador local não é o gerador oficial do Supabase CLI. Quando a stack/projeto estiver disponível, comparar também com `supabase gen types --local --schema public`. A geração oficial não foi executada com sucesso aqui por falta da stack. Os tipos descrevem estrutura, não autorização: `Insert`/`Update` não substituem grants por coluna, RLS e validação no servidor.

Detalhes do que foi ou não validado estão em [VALIDACAO-BANCO.md](VALIDACAO-BANCO.md).
