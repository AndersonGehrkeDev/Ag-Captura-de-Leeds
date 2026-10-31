# Validação consolidada — 30/10/2026

Rodada limitada ao pedido do Prompt 13: cobertura existente inspecionada, um navegador (Chromium) e somente 390 × 844 e 1366 × 768. Não foi executado `npm run check`, a suíte inteira, uma matriz de cenários ou APIs pagas. Nenhum módulo de produto, dependência, migração, credencial ou configuração remota foi alterado.

## Resultado

| Verificação | Resultado final | Execuções |
| --- | --- | --- |
| `npm.cmd run lint` | Aprovado, sem avisos | Uma |
| `npm.cmd run typecheck` | Aprovado após corrigir o tipo da configuração nova do Playwright | Duas; somente o comando que falhou foi repetido |
| `npm.cmd run build` | Aprovado; build de produção Next.js e rotas gerados | Uma |
| Serviços CRM/PageSpeed/IA | 4 aprovados; 3 casos não selecionados nos arquivos | Uma |
| SQL/RLS entre dois workspaces | 3 aprovados; 71 verificações não selecionadas | Uma |
| Navegador | 3 casos distintos aprovados; os 2 de seleção falharam inicialmente numa expectativa desatualizada | Inicial com 3 casos; reteste apenas dos 2 que falharam |

**Dez casos distintos aprovados**: quatro de serviço, três SQL e três de navegador. Os testes executam adaptadores/RPCs do projeto com respostas externas simuladas; não comprovam conexão com provedores. Lint e build não foram repetidos após mudanças exclusivamente no teste Playwright e na documentação.

## Cobertura escolhida e comandos reais

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test -- src/server/crm/crm.test.ts src/server/audits/audit.test.ts src/server/messages/message.test.ts -t "adiciona referência|move para|falha 429|429 não vaza"
npm.cmd run db:test -- --grep "^SELECT leads:|^UPDATE/DELETE invisíveis"
npx.cmd playwright test --config=playwright.consolidated.config.ts
# Somente os dois casos de navegador que falharam:
npx.cmd playwright test --config=playwright.consolidated.config.ts --project=selecao --output=test-results/consolidada-reteste
```

- **Auth:** caso existente `perfil próprio, cookie de outro workspace recusado e logout`. Login, edição de perfil, recusa do cookie apontando outro workspace, seleção do workspace permitido, logout e bloqueio de `/perfil` sem sessão. HTTP Auth/PostgREST são fixtures locais descartáveis, não Supabase Auth real.
- **Busca e seleção:** dois casos existentes de `tests/selection/map-selection.spec.ts`. Busca explícita no catálogo sintético, nenhuma consulta de detalhes antes da seleção, agrupamento/marcador → mesmos detalhes e seleção na tabela/cards, troca pela lista, rascunho preservado, filtros comuns, fechamento por Escape e foco devolvido no celular. Zero requisições Google e ausência de transbordamento horizontal global nos pontos verificados.
- **CRM:** dois casos existentes de `src/server/crm/crm.test.ts`. Inclusão autorizada de referência e cadastro manual, deduplicação por workspace, metadados de fonte não copiados indiscriminadamente; mudança para Em análise com responsável, etiquetas, persistência e histórico. Usa serviço e RPC SQL sob role `authenticated` no banco descartável.
- **Falhas de provedores:** caso 429 existente de PageSpeed verifica tarefa falhou, relatório ausente, uma chamada, sem nota zero, avaliação negativa inventada ou corpo de erro vazado; caso 429 de IA usa SDK oficial com fetch simulado, erro normalizado, ausência de chave/corpo restrito, sem retry e sem rascunho inventado. Sem chamadas pagas.
- **Isolamento SQL:** SELECT de leads sob identidades A e B retorna somente o workspace permitido. UPDATE e DELETE de A contra o lead de B afetam zero linhas; B confirma nome original preservado. Dez migrações aplicadas em **PostgreSQL 18.6/PGlite 0.5.12**, com roles e RLS efetivamente executados. `auth.uid()` é simulada: não equivale à stack completa Supabase/Auth/PostgREST/PG17 nem a concorrência entre conexões.

## Falhas encontradas e correções

1. **Typecheck:** a primeira versão de `playwright.consolidated.config.ts` usava uma interseção incorreta para `webServer`, deixando `command` possivelmente ausente. Corrigida por narrowing com `Array.isArray`, sem alteração de runtime. O segundo e último typecheck passou.
2. **Seleção desktop e mobile:** ambos pararam em `Adicionar lead` desativado, expectativa da etapa anterior à implementação do CRM. A funcionalidade atual permite tentar a operação e verifica autorização/configuração no servidor. A expectativa foi substituída por uma verificação mais direta do bloqueio: clicar exige HTTP 503 com `not_configured`, mensagem compreensível e nenhuma confirmação ou link de lead salvo no ambiente sem executor. As verificações de sincronização, detalhes, rascunho, filtros, foco e ausência de chamadas Google foram preservadas. Somente esses dois casos foram repetidos; ambos passaram.

Nenhuma falha restante no conjunto selecionado. A atualização do teste não configura CRM nem libera conteúdo da fonte. A gravação autorizada foi verificada separadamente nos casos de serviço/SQL.

## Evidências visuais

Capturas inspecionadas no Chromium, com o mesmo build de produção usado no login:

- [Desktop — seleção e anotações](../test-results/consolidada-reteste/selection-map-selection-seleção-sincronizada-em-1366x768-selecao/selecao-marcador.png).
- [Desktop — mapa filtrado](../test-results/consolidada-reteste/selection-map-selection-seleção-sincronizada-em-1366x768-selecao/mapa-filtrado.png).
- [Mobile — drawer e anotações](../test-results/consolidada-reteste/selection-map-selection-seleção-sincronizada-em-390x844-selecao/selecao-marcador.png).
- [Mobile — mapa filtrado](../test-results/consolidada-reteste/selection-map-selection-seleção-sincronizada-em-390x844-selecao/mapa-filtrado.png).

Tema escuro/amarelo, composição lateral/filtros/mapa/painel no desktop e drawer móvel legíveis, sem sobreposição observada nesses estados. A tabela fica na continuação vertical do desktop; o mapa local permanece identificado como projeção esquemática, sem cartografia Google. Capturas usam o scroll da interação, não são imagens de todas as telas. Fechamento, foco, seleção e filtros foram exercitados por interação, além das capturas.

Falhas iniciais conservam screenshot, contexto e trace em `test-results/consolidada-inicial/`; o reteste usa outra pasta para não apagá-las. Artefatos locais são ignorados pelo Git. O relatório HTML em `playwright-report/consolidada/` corresponde ao reteste; resultados iniciais estão documentados acima e nos artefatos iniciais.

## Não executado e pendências reais

- Restante dos testes Vitest, 71 verificações SQL não selecionadas, demais testes/projetos Playwright, navegação geral de menu, CSV em planilha, concorrência/leases amplos e geração/auditoria válida nesta rodada. Testes existentes mantidos; não foram criados casos equivalentes.
- Outros navegadores, larguras, orientação horizontal, teclado virtual, áreas seguras em aparelho físico e auditoria completa de acessibilidade. Esta rodada substitui a matriz ampla anteriormente prevista para o Prompt 13; a matriz histórica não foi repetida.
- Supabase nativo/hospedado, SMTP/convites reais, PostgreSQL 17 e conexões concorrentes. O isolamento SQL local passou, mas **a validação na stack Supabase real permanece pendente**; o teste não a declara conectada.
- Google permanece bloqueado pelas decisões de produto. Nenhuma chamada real a Google, PSI ou OpenAI, deploy Vercel, publicação GitHub, análise de custos ou instalação.
- Aplicar migrações 001–010 e provisionar identidade/workspace no Supabase real; configurar URLs/chave publicável e callbacks; preparar somente integrações autorizadas, evidências de origem, hashes privados dos executores e contadores. Guias: `AUTENTICACAO.md`, `BUSCA-DE-EMPRESAS.md`, `AUDITORIAS.md`, `MENSAGENS-IA.md` e `CRM.md`. Nenhum segredo deve ser enviado pelo chat.

## Infraestrutura de seleção acrescentada

`playwright.consolidated.config.ts` reutiliza testes, servidores locais e fixtures existentes, com um worker, sem retries automáticos, sem build implícito e chaves externas vazias. `supabase/tests/security.test.mjs --grep` filtra rótulos existentes, informa quantos foram ignorados e falha se nenhum corresponder; sem filtro mantém todas as verificações. Não há novos testes de produto nem redução das assertivas do isolamento SQL.
