# AG Prospecção — AG Soluções Digitais

Base técnica de uma plataforma de prospecção de empresas e acompanhamento comercial. Interface em português do Brasil, com tema preto/grafite/dourado e organização mobile-first.

Inclui a base técnica, interface de **Prospecção de Empresas** com demonstração explícita, banco multiworkspace com RLS e autenticação Supabase SSR implementada. Login, perfil, seleção de workspace e convites usam clientes apropriados para servidor/navegador. A conexão a um projeto Supabase real e as integrações de busca/mapa/auditoria/IA dependem de configuração e validação. A ausência de credenciais nunca ativa dados demonstrativos automaticamente.

## Instalação e execução

Ambiente verificado: Node.js **22.13.0**, npm **10.9.2**, Windows. Use a versão de Node registrada em `.nvmrc` / `.node-version` e o npm indicado em `packageManager`. O projeto utiliza somente npm e `package-lock.json`.

```bash
npm ci
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000): páginas privadas encaminham ao `/login`. Sem configuração, o acesso fica indisponível com os nomes das variáveis pendentes. Use **Explorar demonstração** para abrir [a tela demonstrativa pública](http://localhost:3000/prospeccao/demonstracao), que não exige chaves. `/base`, `/configuracoes`, `/prospeccao` e `/leads` exigem autenticação e associação ao workspace quando aplicável; a prospecção permanece sem resultados de buscas inexistentes.

O cadastro começa fechado, por convite. Configuração de Auth, callbacks, templates de confirmação/recuperação, provisionamento do owner e convites: [AUTENTICACAO.md](docs/AUTENTICACAO.md). Não há usuário/senha de demonstração com acesso ao banco real.

## Configuração e primeiro acesso

**Ambiente publicado já configurado:** abra [Recuperar acesso](https://ag-captura-de-leed.vercel.app/recuperar-senha), informe o mesmo e-mail da conta Supabase autorizada e defina sua senha pelo link recebido, **no mesmo navegador que iniciou a recuperação** (PKCE). O owner e o workspace AG já foram provisionados; não é necessário cadastrar-se ou repetir migrações/bootstrap. Não há senha publicada. Entrega do e-mail e definição da senha pelo usuário ainda não foram verificadas.

Production usa o projeto dedicado **`omvbcuistwursfjopzmb` / `ag-prospeccao`**, Free, em São Paulo. O projeto anteriormente vinculado pertencia a outro aplicativo e foi preservado. Login real, tela de prospecção e gravação/releitura de um registro interno passaram na Vercel. O registro **Verificação de publicação — registro interno (31/10/2026)** identifica somente essa conferência, sem afirmar ser uma empresa.

**Sem serviços externos:** após `npm ci` e `npm run dev`, abra `/prospeccao/demonstracao`. É uma demonstração identificada; nenhuma empresa, anotação ou lead dessa tela é persistido no banco real.

**Para uma nova instalação ou ambiente local com login e CRM reais:**

1. Copie `.env.example` para `.env.local` **somente se esse arquivo ainda não existir**. Preencha diretamente no arquivo `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do projeto correto. Mantenha `AUTH_ALLOW_SIGNUP=false`. Não envie valores de chaves pelo chat ou ao Git.
2. Autentique e vincule o Supabase CLI ao projeto correto; confira o histórico e aplique **somente as migrações pendentes até 010**, sem reset/seed. Comandos de dry-run/aplicação estão em [PUBLICACAO.md](docs/PUBLICACAO.md#3-supabase--somente-pendentes-sem-reset). `private` deve permanecer fora da Data API.
3. No Supabase Auth, mantenha signup fechado e configure Email, confirmação, templates, Site URL e os callbacks exatos da origem usada. Crie/convide a conta inicial e confirme o e-mail. Provisione explicitamente esse UUID como owner com o exemplo administrativo [bootstrap.sql.example](supabase/bootstrap.sql.example), substituindo a placeholder; não há auto-claim nem senha inicial do projeto.
4. Para gravar leads/metadados, configure `CRM_EXECUTOR_SECRET` **somente no servidor**, seu SHA-256 em `private.crm_executor_config` e `FEATURE_OWN_DATA_PERSISTENCE=true`, conforme [CRM.md](docs/CRM.md). A chave privilegiada Supabase não é necessária ao CRUD comum. Mantenha auditoria, IA, exportação e fontes desativadas até configurar suas evidências, cotas e credenciais próprias.
5. Reinicie o servidor, entre em `/login` com a conta confirmada e selecione o workspace, se solicitado. Em `/leads`, use **Cadastrar lead manualmente → Salvar lead manual** para uma identificação interna própria e confira a persistência após recarregar. Isso não comprova nome empresarial nem autoriza copiar Google. `/prospeccao` continua sem resultados se não houver fonte aprovada configurada.

**Hospedagem:** [ag-captura-de-leed.vercel.app](https://ag-captura-de-leed.vercel.app), Node 22, Hobby mantido para uso próprio não comercial, sem upgrade. Production está ligada à base AG dedicada, com dez migrações aplicadas, signup fechado, callbacks exatos, owner e executor CRM. Preview ainda não tem banco/configuração separados. O Free recusou e-mails personalizados com o provedor padrão: templates nativos mantidos, sem contratar SMTP. Guia, evidências e rollback: [PUBLICACAO.md](docs/PUBLICACAO.md).

## Situação conferida pelos registros

| Área | Implementado e verificado | Limitação real |
| --- | --- | --- |
| Desktop | Composição/tema do mockup: lateral, filtros, mapa, tabela e painel; capturas da interface e conferência consolidada em 1366 × 768 | Logo textual provisório; mapa local esquemático, sem ruas/Google. Não é reprodução integral de todos os detalhes gráficos |
| Mobile | Fluxos de seleção, abas, cards, drawer, Escape/foco e ausência de transbordamento global nos pontos testados em 390 × 844 | Teclado virtual/áreas seguras em aparelho físico não validados |
| Busca/mapa | Catálogo privado sob permissões; seleção sincronizada mapa/lista/detalhes validada com fixtures | Fonte comercial não configurada; Google Places/Maps bloqueados |
| Auditorias/IA | Adaptadores PageSpeed e OpenAI/Responses, tarefas/cotas e estados de falha; respostas simuladas válidas e de erro nas etapas correspondentes | Nenhuma análise/geração real validada; faltam chaves, evidências, limites e configuração |
| CRM/Auth/RLS | Cobertura anterior com fixtures/SQL; agora também login real, abertura da prospecção e salvar/reler um registro no Supabase/Vercel, com owner e 22 tabelas públicas RLS | Isolamento A/B e tentativas indevidas seguem com evidência do harness; não foram repetidos entre contas reais em produção. Recuperação/e-mail do usuário pendente |
| GitHub/CI | [Repositório publicado](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds); tipos/lint/build e dez casos essenciais aprovados entre [execução inicial](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41159440361) e [reteste direcionado](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41159814737) | Execução inicial preserva a falha corrigida; reteste parcial. [Production](https://ag-captura-de-leed.vercel.app) com login/CRM conferidos; Preview não configurada |

Esta conferência reutiliza evidências de [VALIDACAO-ETAPA-2.md](docs/VALIDACAO-ETAPA-2.md), [VALIDACAO-CONSOLIDADA.md](docs/VALIDACAO-CONSOLIDADA.md) e [ACOMPANHAMENTO.md](docs/ACOMPANHAMENTO.md). Não representa outra rodada de testes nem certifica integrações ainda sem acesso.

## Contratos e permissões de integração

Busca, detalhes, auditoria, geração de mensagem e persistência própria têm contratos estritos e política central por provedor/campo/finalidade. Flags começam fechadas. Catálogo, auditoria PSI e mensagens OpenAI têm implementação condicionada à configuração/evidências. Não há chamadas comerciais automáticas.

**Google Places/Maps estão bloqueados para o caso de uso atual**, inclusive persistência de novos IDs. A exceção de cache de `place_id` não aprova prospecção/diretórios/publicidade ou conteúdo derivado. Cópia manual não muda origem. A migração 006 bloqueia novas referências Google e oculta legadas, sem apagar dados existentes. Configurações, fontes oficiais atuais, regimes EEA/não EEA, atribuições e alternativas próprias/licenciadas: [integracoes.md](docs/integracoes.md).

## Busca em fonte própria/licenciada

A implementação lê um catálogo privado aprovado por operador, com busca livre, nichos em português, palavras-chave e detalhes sob demanda. Configure `OWNED_CATALOG_FILE` somente no servidor e habilite `FEATURE_CATALOG_SEARCH` / `FEATURE_CATALOG_DETAILS`. Fonte, licença e proveniência são verificadas a cada operação. Sem arquivo, o estado permanece sem fonte; não há demo silenciosa. Nenhum catálogo comercial real foi configurado.

Cidade usa associação declarada na fonte; raios exigem centro/coordenadas autorizados e não são divisas municipais. Há cancelamento, nova tentativa, estados parciais, contagens com escopo e até 3 páginas/60 resultados por busca. Atribuições acompanham resultados. Arquivo/schema, aprovação, segurança, limites, restrições de deploy e pendências: [BUSCA-DE-EMPRESAS.md](docs/BUSCA-DE-EMPRESAS.md). Não coloque catálogos em `public` nem no Git. A busca não grava leads nem inicializa mapa externo; mensagens são ações explícitas separadas.

## Interface de prospecção

**Páginas do menu:** Dashboard com contagens reais e tarefas; Mapa de Oportunidades reaproveitando o mapa/filtros autorizados; campanhas sem disparos; modelos com criar/editar/excluir/cópia autorizada; relatórios de etapas, ganhos/perdas e contadores; configurações de perfil/workspace/membros e ambiente. A lateral mostra limites registrados do período, com atualização explícita; não existe cobrança ou pagamento. Aplicar migração 010 para a proteção Não contatar nas campanhas. Rotas, permissões, limites e verificação única de navegação: [PAGINAS-DO-MENU.md](docs/PAGINAS-DO-MENU.md).

**CRM:** `/leads` oferece lista/cards, Kanban com oito etapas, cadastro manual de identificação interna, responsável, etiquetas, anotações persistentes, próximo contato, Não contatar e histórico. Adicionar pela prospecção retém somente referência autorizada, sem duplicação por workspace/fonte/ID; conteúdo da empresa é consultado com direitos vigentes. CSV exporta apenas campos autorizados e metadados estruturados, com neutralização de fórmulas. Aplicar migração 009, configurar `CRM_EXECUTOR_SECRET`/hash, flags e, para fontes, política SQL/manifesto e retenção conforme [CRM.md](docs/CRM.md). Sem Supabase real verificado; adicionar, mover e anotar passaram em fixtures/SQL local.

**Mensagem IA:** tons Profissional/Consultivo/Direto, composição estruturada com SDK oficial OpenAI/Responses, editor, regeneração e cópia revisada; envio manual. Reutiliza modelos existentes com evidência de origem e cotas/tarefas duráveis. Só nome e descrição de serviço autorizados entram na IA; Google, PSI e anotações permanecem excluídos. Configurar migração 008, `OPENAI_API_KEY`, `OPENAI_MODEL`, `MESSAGE_EXECUTOR_SECRET`/hash privado, contador mensal, flags e evidências conforme [MENSAGENS-IA.md](docs/MENSAGENS-IA.md). SDK e lockfile fixados; geração válida e erro 429 verificados com fixtures sem chamadas pagas. Conexão real ainda não verificada.

**Auditoria do site:** aba nos detalhes, mobile por padrão e desktop por escolha, com notas disponíveis, recomendações, data e avaliação comercial simples separada do Lighthouse. Reutiliza tarefas/cotas duráveis no Supabase; não retém relatórios PSI nem executa trabalho em memória após a resposta. Aplicar as migrações pendentes até 010 e configurar chave PSI, `AUDIT_EXECUTOR_SECRET`/hash privado, cotas e evidências conforme [AUDITORIAS.md](docs/AUDITORIAS.md). Resposta válida e falha passaram com fixtures na etapa própria; a falha foi reutilizada na consolidação/CI. Não houve análise real; build e conferência consolidada estão registrados, sem validar essa integração real.

O desktop mantém menu lateral de 238 px, painel direito de 335 px, filtros à esquerda, mapa central e tabela inferior. Em telas intermediárias os detalhes passam para drawer; no celular há menu recolhível, filtros expansíveis, abas Mapa/Lista e cards de empresas. Tokens de cores estão em `src/app/globals.css`; layout e estados visuais em `src/app/prospecting.css`.

`/prospeccao/demonstracao` usa somente as oito empresas sintéticas de `src/demo/prospect-companies.ts`. O modo fica visível no cabeçalho desktop e em um aviso no celular. Avaliações, endereços, pontuações, plano e consumo são ilustrativos. Não existem telefones, domínios reais nem dados obtidos do Google. O mapa é uma ilustração local, carregada sob demanda; não é Google Maps e não calcula distâncias.

Na demonstração, filtros por segmento/palavra-chave, oportunidades, ordenação, seleção, leads e anotações operam localmente. Leads, notas e edições não são gravados em banco nem mantidos após recarregar a tela. Mensagens são modelos de exemplo editáveis, identificados como **não gerados por IA**, e podem ser copiadas. Não há envio. Exportação, contatos reais, upgrades e módulos adicionais informam indisponibilidade.

A identificação AG é textual e provisória, pois não foi disponibilizado arquivo original de logo no projeto. O estabelecimento ilustrado é fictício. Procedência e prompt do asset estão em [ASSETS-ETAPA-2.md](docs/ASSETS-ETAPA-2.md).

No PowerShell com execução de scripts desabilitada, use `npm.cmd` e `npx.cmd` nos mesmos comandos. Não é necessário alterar a política do sistema.

Para configurar recursos futuramente, copie `.env.example` para `.env.local` e preencha somente as variáveis necessárias diretamente nesse arquivo. No PowerShell:

```powershell
if (!(Test-Path -LiteralPath .env.local)) {
  Copy-Item -LiteralPath .env.example -Destination .env.local
}
npm.cmd run dev
```

Não sobrescreva um `.env.local` existente. Não envie segredos pelo chat ou pelo Git. Reinicie o servidor após alterar variáveis; `NEXT_PUBLIC_*` deve ser configurado antes do build de produção quando utilizado pelo cliente.

Para executar o build de produção:

```bash
npm run build
npm start
```

## Verificação e testes

O recorte essencial já foi executado no Prompt 13 e na CI, com resultado/limitações no quadro acima e nos relatórios vinculados. Esta conferência final alterou apenas documentação, sem nova bateria. Os comandos completos abaixo são disponíveis para solicitação explícita; para o conjunto selecionado, use os comandos registrados em [VALIDACAO-CONSOLIDADA.md](docs/VALIDACAO-CONSOLIDADA.md).

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` executa lint, conferência dos tipos do banco, checagem TypeScript, testes unitários, testes SQL/RLS e build, interrompendo na primeira falha. A checagem de tipos inclui `next typegen`, portanto funciona sem depender de um build anterior. O build Next.js não substitui o lint.

Testes unitários com Vitest usam ambiente Node e cobrem configuração por recurso, redirecionamentos/origens, senha, chaves publicáveis e ausência de valores sensíveis no relatório. SDKs externos não são chamados nesses testes.

Testes de navegação e responsividade com Playwright:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

O Playwright inicia/encerra servidores de produção em `127.0.0.1:3100`, `3101`, `3102`, `3103` e uma fixture HTTP em `54331`; essas portas precisam estar livres. A fixture testa contratos do SDK SSR e SQL/RLS reais em PGlite, com identidades sintéticas; não é Supabase Auth/SMTP real. O runner cobre Auth, isolamento, regressão de base/demonstração e os três modos de busca nas seis larguras, incluindo celular horizontal. Somente o processo 3103 recebe catálogo sintético explicitamente configurado em `.local-data/search-test.catalog.local.json`, gerado pelo suporte de testes, nunca carregado automaticamente na aplicação comum. Nenhum serviço externo é chamado. Resultados e limites: [VALIDACAO-AUTH.md](docs/VALIDACAO-AUTH.md) e [VALIDACAO-BUSCA.md](docs/VALIDACAO-BUSCA.md).

Capturas são geradas em `test-results/<teste>/`, incluindo `base.png`, `configuracoes.png`, `prospeccao.png`, `prospeccao-completa.png`, `lista.png` e `detalhes.png` conforme o fluxo. Relatório local em `playwright-report/index.html`. Esses artefatos são ignorados pelo Git. Viewports emulados não comprovam teclado virtual e áreas seguras em dispositivo físico; essa verificação permanece pendente.

## Configuração por recurso

A validação é tardia, executada no servidor e independente para cada recurso. Um recurso ausente ou inválido não impede que a interface execute. A tela retorna **somente nomes e estados**, nunca valores do ambiente. Não existe formulário de credenciais no navegador.

| Recurso | Variáveis |
| --- | --- |
| Aplicação | `NEXT_PUBLIC_APP_URL` (padrão local: `http://localhost:3000`) |
| Auth e banco | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Busca de empresas | `OWNED_CATALOG_FILE`, `FEATURE_CATALOG_SEARCH`, `FEATURE_CATALOG_DETAILS` e evidências aprovadas do catálogo privado |
| Mapa local | Coordenadas aprovadas do catálogo; sem chave/SDK externo. Google Maps continua bloqueado |
| Auditorias | `GOOGLE_PAGESPEED_API_KEY`, `AUDIT_EXECUTOR_SECRET`/hash privado (servidor) |
| IA | `OPENAI_API_KEY`, `OPENAI_MODEL`, `MESSAGE_EXECUTOR_SECRET`/hash privado (servidor) |
| CRM | Supabase, `CRM_EXECUTOR_SECRET`/hash privado, flags; fonte/evidências/política SQL para referências e CSV |

Os estados são **configuração pendente**, **revisar configuração** ou **configuração presente**. O último confirma apenas o formato; não confirma acesso remoto, cobrança, cotas, autenticidade da chave ou disponibilidade do modelo. Origens de aplicação e Supabase exigem HTTPS, permitindo HTTP em loopback para desenvolvimento, sem credenciais embutidas, caminhos extras, query ou fragmento. Chaves privilegiadas são recusadas no campo publicável Supabase.

A estrutura do mapa prevê Map ID para a futura implementação com marcadores. A chave publicável do mapa precisa de restrições por domínio e API; a chave Places permanece no servidor. Não use chaves secretas em `NEXT_PUBLIC_*`.

`AUTH_ALLOW_SIGNUP=false` mantém o cadastro público fechado; abrir cadastro exige também habilitá-lo no Supabase. `SUPABASE_SECRET_KEY` é opcional e exclusiva do envio administrativo de convites Auth, depois de autorização pelo usuário e RPC. Sem ela, novas contas devem ser convidadas pelo painel Supabase; contas existentes podem aceitar convites de workspace em `/workspaces`. Operações comuns sempre usam a sessão do usuário e RLS. Auditorias, mensagens e CRM exigem provas próprias do backend e hashes privados conforme seus guias; não existe trabalhador autônomo ou rotina programada configurada.

SDKs Supabase e OpenAI estão instalados com versões exatas no lockfile. PSI, mensagens e CRM têm implementação condicionada à configuração/evidências, verificada com fixtures; nenhuma conexão comercial real foi estabelecida. Google Places/Maps permanecem bloqueados. Configurar uma variável não comprova conexão nem permissão.

## Banco Supabase por migrações

O modelo tem 22 tabelas públicas, papéis `owner/admin/member`, isolamento por workspace, FKs compostas, proveniência de campos, políticas de uso, convites protegidos, filas e consumo com reservas idempotentes. Não arquiva respostas brutas do Google. O workspace inicial AG existe sem proprietário até provisionamento administrativo explícito; não há auto-claim no cadastro.

```powershell
npm.cmd run db:test
npm.cmd run db:types
npm.cmd run db:types:check
```

Os comandos acima não exigem Docker nem chaves: aplicam as migrações em PostgreSQL PGlite descartável e geram tipos pelo catálogo executado (atualmente dez). A suíte de segurança inclui dois workspaces e cenários históricos de barreira Google/atualização legada. Na consolidação/CI foram selecionadas três verificações SQL: SELECT isolado A/B e tentativa indevida de UPDATE/DELETE; o restante não foi reexecutado. Auditoria, mensagens, CRM e páginas de menu têm evidências nos respectivos guias. O harness Auth é exclusivo de teste; não valida o serviço Auth/JWT real. Resultado consolidado: [VALIDACAO-CONSOLIDADA.md](docs/VALIDACAO-CONSOLIDADA.md).

Com Docker/Podman disponível, `npm run db:start` inicia a stack oficial e `npm run db:reset:local` recria somente o banco local a partir das migrações, apagando seus registros. Seeds automáticas estão desativadas; a seed sintética exige opt-in explícito e nunca deve ser aplicada em produção. `npm run db:stop` encerra a stack local.

Nesta máquina o start oficial falhou por ausência de Docker/Podman; a execução disponível ocorreu em PostgreSQL 18.6/PGlite, enquanto o config Supabase local mantém major 17. Stack completa, major efetivo do destino, Auth/Data API e concorrência de conexões ainda precisam de validação no ambiente correspondente.

Tipos gerados: `src/lib/supabase/database.types.ts`. Não edite manualmente; `db:types:check` compara schema, relacionamentos, funções e hash das migrações. Este gerador local não se apresenta como saída do Supabase CLI. Detalhes, matriz de papéis, bootstrap do proprietário e comandos de implantação estão em [BANCO-DE-DADOS.md](docs/BANCO-DE-DADOS.md); resultados e limites em [VALIDACAO-BANCO.md](docs/VALIDACAO-BANCO.md).

## Organização

```text
src/
  app/                         # Rotas e composição no servidor
  components/layout/           # Navegação interativa e estrutura visual
  components/ui/               # Componentes shadcn/ui personalizados
  domain/                      # Contratos e regras puras, sem leitura de ambiente
  features/
    auth/                      # Formulários, estados pendentes e eventos de sessão
    prospeccao/                # Regras puras de filtros e componentes da tela
    mapas/                     # Mapa local demonstrativo, sem SDK externo
    auditorias/
    ia/
    crm/
    campanhas/
    relatorios/
    configuracoes/             # Apresentação do diagnóstico de ambiente
  demo/                        # Fixtures sintéticas isoladas
  lib/                         # Utilitários de apresentação
  server/
    auth/                      # Identidade, autorização e Server Actions protegidas
    configuration/             # Leitura protegida de ambiente e validação tardia
    integrations/              # Evidências do servidor e preparação protegida de operações
    providers/                 # Adaptadores/configuração separados por provedor
public/demo/                  # Imagem ilustrativa de estabelecimento fictício
supabase/migrations/          # Schema, RLS e operações SQL versionadas
supabase/seeds/               # Seed sintética, desativada por padrão
supabase/tests/               # Testes SQL/RLS executados em PostgreSQL
scripts/db/                   # Banco de teste e geração/conferência de tipos
tests/e2e/                     # Auth, base e prospecção
tests/support/                 # Fixture HTTP de Auth, exclusiva dos testes
docs/                          # Versões, arquitetura e acompanhamento
```

Páginas/layouts são Server Components por padrão. Formulários e demais interações usam Client Components. O módulo que lê ambiente e os adaptadores de servidor usam `server-only`. ESLint restringe importações de servidor pela UI, com exceção explícita dos dois módulos `use server` de Server Actions; o domínio permanece independente do framework. Não há acesso privilegiado a provedores em componentes. Mais detalhes em [ARQUITETURA.md](docs/ARQUITETURA.md).

## Estado e pendências

- Verificações e evidências desta etapa: [ACOMPANHAMENTO.md](docs/ACOMPANHAMENTO.md).
- Versões exatas, fontes oficiais e decisão de compatibilidade do ESLint: [VERSOES.md](docs/VERSOES.md).
- GitHub confirmado: [AndersonGehrkeDev/Ag-Captura-de-Leeds](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds). Vercel [publicada](https://ag-captura-de-leed.vercel.app), Supabase dedicado configurado e login/CRM conferidos. Evidências: [PUBLICACAO.md](docs/PUBLICACAO.md) e [ACOMPANHAMENTO.md](docs/ACOMPANHAMENTO.md).
- Production: migrações, Auth/callbacks, owner e CRM configurados; login real e persistência conferidos. Entrega de e-mail/definição de senha pelo usuário, convites adicionais, isolamento entre duas contas reais e integrações externas ainda não foram validados. E-mails personalizados exigem configuração de SMTP permitida pelo provedor; nenhum serviço foi contratado.
- Prospecção tem demonstração explícita e busca condicionada a fonte autorizada. Módulos do menu/CRM foram implementados e verificados com fixtures; uso comercial real depende de configuração e validação no ambiente destino.
# Busca nacional sem créditos de API

A alternativa IBGE + OpenStreetMap/Private.coffee + OpenFreeMap permite selecionar municípios de todo o Brasil, com busca por cidade, nicho ou palavra-chave e mapa escuro. Não requer cartão, chave Google ou créditos. **Cobertura colaborativa parcial e disponibilidade comunitária; não lista todas as empresas do país.** Faltas de site/avaliações não viram diagnósticos.

Configure no servidor `OPEN_DATA_CATALOG_ENABLED`, `OPEN_DATA_WORKSPACE_ID`, `OPEN_DATA_REVIEWER_ID`, `FEATURE_CATALOG_SEARCH` e `FEATURE_CATALOG_DETAILS`; reutilize Supabase/CRM e aplique a migração 011 sem reset. Credenciais e destinos existentes permanecem em seus ambientes. Consulte [configuração, fontes e limites](docs/BUSCA-GRATUITA.md). `OWNED_CATALOG_FILE` tem prioridade se estiver preenchido. Sem configuração, a interface informa indisponibilidade, sem demonstração silenciosa.

Após entrar e selecionar o workspace: abra Prospecção, filtre os municípios por nome ou UF, selecione a cidade e clique em **Buscar empresas**. Use Mapa/Lista, abra detalhes e **Adicionar lead** para salvar a referência no CRM. O mapa carrega após a consulta; celulares abrem detalhes em drawer. Cache por 24 h, até 60 resultados por busca e até 100 novas consultas/dia nesta instalação são limites operacionais gratuitos. Raios, exportação de campos OSM e IA para esses dados permanecem indisponíveis. O cadastro/recuperação de senha seguem o primeiro acesso documentado abaixo.
