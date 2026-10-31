# Páginas do menu — 30/10/2026

Implementações simples sobre o banco, Auth/RLS, componentes e política de dados existentes. Sem dependências novas, APIs pagas, pagamentos, geração automática ou disparos. Todas as rotas abaixo exigem sessão e, quando aplicável, workspace autorizado; o Proxy renova cookies e aplica cabeçalhos privados/no-store.

| Menu/rota | Comportamento |
| --- | --- |
| Dashboard `/base` | Contagens exatas de leads não arquivados por etapa, tarefas abertas, campanhas não arquivadas e Não contatar; funil atual; criar tarefa atribuída a si e concluir tarefa autorizada |
| Prospecção `/prospeccao` | Implementação anterior preservada, com ação explícita e fonte autorizada |
| Meus Leads `/leads` | CRM anterior preservado |
| Mapa de Oportunidades `/mapa` | Reutiliza `LiveProspectingScreen`, filtros, seleção, mapa local agrupado e detalhes sob demanda; muda título/contexto, sem nova consulta automática |
| Campanhas `/campanhas` | Criar/editar/arquivar, associar modelo e leads do CRM; marcar planejamento/contato/resposta/remoção por confirmação manual |
| Modelos de Mensagens `/modelos` | Criar/editar/excluir modelos e copiar corpo salvo quando sua origem autoriza; preserva a tabela usada pela geração de mensagens |
| Relatórios `/relatorios` | Distribuição atual por etapa, número de leads em Ganho/Perdido e unidades/limites registrados no período UTC |
| Configurações `/configuracoes` | Perfil existente, renomear workspace autorizado, seleção de workspace, acesso a membros/convites e diagnóstico seguro de ambiente/flags/requisitos |

## Dados, escopo e estados

Dashboard e Relatórios usam consultas com contagem `exact`, `workspace_id` e RLS, não contam somente uma página carregada. Funil e ganhos/perdas consideram **a etapa atual de leads não arquivados**: não afirmam conversão histórica, receita, contratos ou resultados comerciais garantidos. Falha de uma consulta vira “—”/indisponível, não zero. Zero somente aparece como resultado de uma consulta bem-sucedida.

Tarefas mostram até 20 abertas, por prazo, com aviso de limite. Campanhas mostram até 50 recentes; participantes, até 100 por campanha; modelos, até 100 ativos; escolhas de leads usam os primeiros 50 do serviço CRM, com esse escopo indicado. Membros em Configurações mostram até 50 associações e remetem ao módulo existente de equipe/convites. Não se apresentam esses limites como totais da população. Se uma identificação de lead não estiver carregada/autorizada, usa-se ID próprio/rótulo interno com aviso, sem consultar/copiar conteúdo externo indevido.

Sem dados há instruções úteis para criar tarefa/modelo/campanha ou configurar fonte. Sem acesso/configuração, o recurso informa indisponibilidade; nenhuma demonstração ou seed é ativada silenciosamente. Filtros, alternância de mapa/lista, agrupamentos e atribuições usam a implementação autorizada existente. O mapa não é Google Maps nem cartografia real, não classifica empresas automaticamente e não varre áreas por grade. Abrir `/mapa` não faz busca paga ou inicializa SDK Google.

## Consumo sem cobrança fictícia

A lateral, o Dashboard e os Relatórios reutilizam `ConsumptionSummary`. Valores vêm de `usage_counters` do workspace, no mês UTC corrente: `used_units`, `reserved_units`, `unit_limit` e datas reais do período. Sem contador não há limite presumido ou plano “Profissional”; falha não produz 0/500 fictício. Reservas são mostradas separadamente; a barra usa utilizadas + reservadas, sem inferir gasto financeiro. Atualizar dados é ação explícita via `router.refresh`, que relê Auth/banco, sem disparar provedores comerciais.

Esse ledger mostra **unidades registradas**, não tokens, preço ou todos os cliques. Auditoria/IA debitam tentativas pelas regras anteriores. Busca em catálogo e CSV ainda não debitam automaticamente cada ação nesses contadores; as linhas correspondentes são identificadas como “contador” e essa limitação fica visível nos relatórios. Não se vende plano, não se emite cobrança, não se inventam pagamentos e não há Upgrade comercial. A demonstração pública conserva apenas seu plano fictício explicitamente identificado. A campainha não ganhou números/notificações artificiais.

## Permissões, tarefas e campanhas

`POST /api/gestao` aceita comandos estritos, JSON de até 32 KiB e origem exata; verifica identidade com `getUser`, associação e papel atual do banco. Cliente Supabase SSR usa a sessão comum e RLS, sem chave privilegiada. Acesso ao workspace não vem somente do cookie e papel não vem de metadata. Campos e relações são limitados no servidor. Erros são constantes e não incluem SQL, tokens, corpo de provedor ou segredo.

- Membros podem criar tarefas próprias e concluir aquelas que criaram ou que lhes foram atribuídas; admin/owner podem gerenciar tarefas do workspace. RLS é verificada novamente na escrita.
- Campanhas, participantes, modelos e nome do workspace exigem **admin/owner** no serviço e nas políticas existentes. Ocultar controles é apenas apresentação. Criar/editar usa constraints de unicidade e FKs de workspace; edições de campanha/modelo incluem `updated_at` para recusar sobrescrita de versão desatualizada.
- Associar lead não duplica o mesmo vínculo, não copia telefone/site/avaliações nem inventa contato. Nome/identificação vem da projeção autorizada do CRM. Modelo associado é só referência; não dispara cópia, IA ou envio.
- Planejado, Contato registrado, Resposta registrada e Removido são registros comerciais **declarados manualmente**, com confirmação explícita no formulário. “Em organização” não ativa envio. Abrir um link não altera status, não marca mensagem enviada e não presume WhatsApp.
- Migração **010** protege Não contatar no banco: bloqueia `planned`/`contacted` quando a preferência está ativa, usando lock do lead. Ao ativá-la no CRM, vínculos ainda planejados viram `removed`. Histórico de contatos/respostas já registrados não é apagado. Nada é enviado automaticamente.

## Modelos e cópia autorizada

Criar/editar/excluir reutiliza `message_templates` e as regras admin/owner. Corpo aceita até 10.000 caracteres; não é enviado à OpenAI por esta página. Excluir modelo em uso é recusado pelas FKs; não se remove associação ou histórico silenciosamente.

O canal `user_input` não é prova de licença. **Criar ou editar não libera cópia/IA automaticamente.** Para copiar, o servidor lê o corpo salvo e encontra o mesmo texto em `messageTemplates` do manifesto privado já adotado. O campo deve ser `service_description` ou `message_draft`; ações `display` e `export`, finalidade `message_draft`, precisam estar vigentes em todos os ancestrais, incluindo `FEATURE_DATA_EXPORT`. Google ou outra ancestralidade restrita permanece recusada. Créditos exigidos são acrescentados ao texto copiado. A associação anterior para geração de IA continua sujeita aos critérios específicos de [MENSAGENS-IA.md](MENSAGENS-IA.md), inclusive seu limite menor de descrição.

Não há formulário de autoaprovação, upload de licenças ou promoção de cópia manual a origem própria. Evidência precisa de aprovação independente no servidor. Sem ela, criar/editar funciona como organização interna e a solicitação de cópia retorna motivo compreensível. Área de transferência depende de HTTPS/permissão do navegador; envio continua manual.

## Configurações

Reutilizados formulário de perfil, workspaces e página de membros/convites existentes. Somente admin/owner renomeiam workspace. Preservadas proteção do último owner, convite com expiração e validação de sessão/destino. Novas rotas entraram na lista fechada de redirecionamentos permitidos, sem aceitar destinos externos arbitrários.

Situação de integrações exibe apenas nomes/estados de variáveis, flags, indicação de caminho configurado para catálogo (sem mostrar o caminho) e formato das três provas de executor. Não mostra valores, não recebe chaves no browser nem verifica acesso comercial automaticamente. Formato presente não comprova hash privado, cotas, licença, conexão ou disponibilidade. Google continua bloqueado mesmo configurado. Não há chamada real aos provedores para “testar conexão” ao abrir a página.

## Verificação direcionada executada

Um único caso de navegador: `npx.cmd playwright test --config=playwright.menu.config.ts` — **1 aprovado**. Reutiliza Auth HTTP de teste e SQL/RLS PGlite existentes, com fixtures privadas explícitas e servidor Next em desenvolvimento, sem build completo. Não é Supabase Auth/PostgREST real.

O fluxo verificou: login; navegação pelos oito itens; criar/concluir tarefa; criar/editar/excluir modelo; copiar modelo previamente autorizado com créditos usando clipboard do Chromium; criar campanha, adicionar lead e confirmar registro manual de contato; ler relatórios e solicitar atualização; buscar no mapa existente com catálogo sintético; editar workspace/perfil e acessar membros. Também abriu o menu recolhível em **390 × 844**, navegou para Relatórios e confirmou ausência de transbordamento horizontal nessa tela. Trecho principal em **1366 × 768**, no mesmo Chromium. Não é nova matriz geral de responsividade ou auditoria.

Uma captura móvel foi produzida e inspecionada em `test-results/navigation-navegação-do-me-b1e92-ais-com-Auth-RLS-sintéticos/menu-relatorios-mobile.png` (artefato local ignorado pelo Git). Ajustada a cor nativa das barras para os tokens dourado/amarelo. A checagem encontrou rótulos de editor/seletor que incluíam o conteúdo do controle; foram associados explicitamente, sem afrouxar a ação testada. Botões de cancelar edição receberam `type=button`. O seletor do teste de contato foi tornado específico ao parágrafo de status, distinguindo-o de uma opção homônima. Testes anteriores não foram apagados ou enfraquecidos.

`npm.cmd run db:types`: dez migrações, **22 tabelas públicas, 14 funções, 8 enums**, tipos gerados por introspecção. `npm.cmd run typecheck` e ESLint direcionado aos módulos tocados aprovados. O harness HTTP foi estendido por allowlists e parâmetros SQL para essas operações; não integra o runtime. A contagem de migrações do teste existente foi atualizada de nove para dez. Durante mudanças rápidas de rota, Next dev registrou abort/ECONNRESET de requisições canceladas; o fluxo concluiu, sem declaração de validação em produção.

Não houve testes individuais por card/página, suíte completa, múltiplos navegadores, build, auditoria geral, chamada paga, ativação de API, convite real, contratação, commit/push/deploy ou configuração remota. As repetições do mesmo caso ocorreram para corrigir falhas observadas e conferir o ajuste de atualização/captura, não como ampliação da suíte.

## Pendências reais

Aplicar migrações até **010**, configurar e validar Auth/RLS/PostgREST no Supabase real, credenciais/provas/flags já documentadas e fonte aprovada. Cópia de modelo depende das evidências vigentes e do corpo idêntico; integração/IA não são liberadas por existir CRUD. Contadores mensais devem ser provisionados pelo operador com limites reais, sem inventar assinatura. Retenção programada, casos negativos/concorrência, stack oficial/produção, teclado físico e matriz consolidada permanecem para o **Prompt 13**. Cobrança e envio automático continuam fora do escopo.
