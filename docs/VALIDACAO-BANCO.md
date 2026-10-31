# Evidências de validação do banco — 27/10/2026

Este documento preserva a entrega original das quatro migrações do banco. Auth adicionou a migração 005 e os contratos adicionaram a 006. A evidência atual de seis migrações/74 cenários SQL e dos contratos está em [ACOMPANHAMENTO.md](ACOMPANHAMENTO.md) e [integracoes.md](integracoes.md); a entrega Auth está em [VALIDACAO-AUTH.md](VALIDACAO-AUTH.md). As limitações de Supabase real e concorrência abaixo continuam pendentes.

## Executado

| Verificação | Resultado |
| --- | --- |
| Instalação de `supabase@2.122.0` e `@electric-sql/pglite@0.5.12` com versões exatas/lockfile | Aprovada |
| Supabase CLI `--version` e `init` | 2.122.0; configuração local criada, sem link remoto |
| Aplicação das quatro migrações desde banco vazio | Aprovada em PostgreSQL 18.6 via PGlite 0.5.12 |
| Seed sem opt-in | Recusada |
| Seed de desenvolvimento em banco descartável | Aprovada; seis identidades sintéticas, dois workspaces |
| `npm.cmd run db:types` | 22 tabelas, 9 funções públicas e 8 enums gerados por introspecção |
| `npm.cmd run db:types:check` | Saída confere com o catálogo migrado e hash dos SQLs |
| `npm.cmd run db:test` | **68 cenários aprovados** |
| `npm.cmd run check` | Lint, tipos gerados, TypeScript strict, 22 testes unitários, 68 cenários SQL e build aprovados |
| `npm.cmd run db:start` | Falhou: `DockerLifecycleInspectError`, Docker e Podman ausentes no PATH |

O motor informado pelo próprio banco foi `PostgreSQL 18.6 (PGlite 0.5.12)`, compilado para WebAssembly. Não se tratou de parser estático ou retorno fake: tabelas, constraints, roles, funções PL/pgSQL, transações e RLS foram executadas pelo motor. Os dados e tokens usados nos testes são sintéticos e o banco é destruído ao terminar.

## Cobertura de segurança

O arquivo `supabase/tests/security.test.mjs` aplica as migrações e a seed, cria dados em cada domínio nos dois workspaces e executa operações como `authenticated`, `anon` e `service_role`. Para identidades de usuário, usa `SET LOCAL ROLE` e contexto `request.jwt.claim.sub` em transação. Os IDs são fictícios e públicos, não credenciais.

Foram verificados:

- Workspace inicial sem proprietário e sem auto-claim; criação futura exige aprovação privada.
- RLS em todas as 22 tabelas públicas, helpers com `search_path` fixo e ausência de `SECURITY DEFINER` no schema exposto.
- SELECT de cada tabela com escopo por workspace usando usuários A e B distintos, dados reais do teste em ambos os lados e verificação de que o usuário não vê o outro workspace.
- Perfil próprio/compartilhado, acesso anônimo recusado e ausência de recursão em membros.
- INSERT proibido fora do workspace, UPDATE/DELETE sem efeito sobre registros invisíveis, grants e trigger contra mudança de tenant/autoria.
- FKs compostas recusando nota/lead, campanha/lead e responsável de outro workspace.
- Permissões de member/admin/owner, tentativas de promoção e alteração arbitrária de proprietário, owner único, transferência atômica e perda imediata de acesso após remoção de membro.
- Convites com papel limitado, segredo em tabela privada, e-mail confirmado correspondente, aceite único e rejeição de expirados/revogados.
- Proveniência por campo, autoria, etapa/histórico e `updated_at` automáticos; logs e histórias protegidos contra escrita direta.
- Deduplicação por workspace/Place ID, inclusive permitindo o mesmo identificador em workspaces diferentes.
- Negação de política Google com conteúdo/IA; usuário não pode aprovar política ou inserir resultados do worker; limites de retenção e limpeza após revogação.
- Reserva idempotente e limitada, isolamento de consumo, impossibilidade de elevar cota/liquidar como usuário, liquidação idempotente por operação confiável e expiração sem consumo inventado.
- Remoção de parâmetros de buscas expiradas e cancelamento de jobs que dependiam deles.
- Auditoria administrativa sem conteúdo/token e bloqueio de adulteração por usuários e DML direto de `service_role`.

Falhas esperadas conferem SQLSTATE ou quantidade de linhas afetadas; erro inesperado ou operação indevida aceita falha o comando com código de saída não zero. Não há exceções de testes ignoradas. Tokens de convite não são impressos nos relatórios.

## Não executado e limitações reais

1. **Stack Supabase completa:** Docker/Podman não estão instalados. O CLI retornou erro de runtime, e o runtime nativo documentado não suporta Windows. Não foram iniciados Auth, PostgREST/Data API ou Studio.
2. **PostgreSQL 17 da configuração local Supabase:** `config.toml` mantém o major 17 gerado pelo CLI. A validação disponível ocorreu em PostgreSQL 18.6 embarcado; execução no major/patch efetivo do Supabase alvo ainda está pendente.
3. **Autenticação/JWT real:** o teste fornece um harness mínimo compatível para `auth.users` e `auth.uid()`. Isso valida as regras SQL sob identidades e roles, mas não valida assinatura JWT, login, expiração de sessão, confirmação de e-mail pelo serviço Auth ou integração HTTP. Não deve ser descrito como teste end-to-end de Supabase Auth.
4. **Concorrência de conexões:** PGlite possui conexão exclusiva. Locks, idempotência, limites e liquidação foram exercitados sequencialmente, não como disputa de transações simultâneas em múltiplas conexões. É necessário repetir os casos de corrida no Supabase/PostgreSQL completo.
5. **Tipos pelo gerador oficial:** os tipos foram gerados do catálogo executado por ferramenta local, em formato compatível com o schema público. `supabase gen types --local` não foi validado contra uma stack real.
6. **Aplicação remota e proprietário real:** nenhum projeto foi vinculado, nenhuma migração foi enviada e nenhum usuário real foi escolhido para o workspace AG. São necessários projeto autorizado, aplicação das migrações e provisionamento explícito do owner com UUID do Auth confirmado. Nenhum segredo deve ser enviado pelo chat.
7. **Executor e retenção agendada:** há modelo SQL e função limitada de limpeza, mas nenhum worker/cron em operação. RLS oculta conteúdo expirado; exclusão física depende de executar a limpeza. Não foram feitas chamadas pagas, buscas, auditorias ou gerações de IA reais.
8. **Interface:** a entrega altera banco, tooling e tipos; não conecta a tela demonstrativa ao CRM nem implementa login. A UI anterior foi preservada e compilou; os testes de navegador da etapa 2 não foram repetidos nesta etapa sem mudanças de interface.

## Fontes oficiais consultadas

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções](https://supabase.com/docs/guides/database/functions), [migrações](https://supabase.com/docs/guides/local-development/database-migrations) e [seeds](https://supabase.com/docs/guides/local-development/seeding-your-database).
- [Geração de tipos do Supabase](https://supabase.com/docs/guides/api/rest/generating-types).
- [Runtimes Docker e nativo](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes): plataformas suportadas e exigências.
- [PGlite](https://pglite.dev/docs/): execução embarcada e limite de conexão exclusiva.
- [Constraints PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html) e [privilégios](https://www.postgresql.org/docs/current/ddl-priv.html).
- [Políticas do Places](https://developers.google.com/maps/documentation/places/web-service/policies): base da decisão conservadora de persistir identificador sem arquivar conteúdo.
