# Arquitetura da base técnica

## Responsabilidades

As rotas em `src/app` compõem os dados no servidor. O catálogo em `src/features` organiza prospecção, mapas, auditorias, IA, CRM, campanhas, relatórios e configurações; as definições não representam serviços implementados. Cada funcionalidade poderá adicionar contratos e regras em seu próprio diretório, mantendo regras puras separadas de sua apresentação.

`src/domain/configuration.ts` define contratos e avaliação pura de configurações. Recebe um ambiente como argumento, não lê variáveis do processo e não acessa rede. Os resultados contêm somente nomes e estados; mensagens do parser não são propagadas, evitando incluir entradas sensíveis em erros.

`src/server/providers/<provedor>/configuration.ts` contém as exigências específicas do provedor, isoladas das funcionalidades. Esses arquivos são descritores puros, sem acesso a segredos nem rede. `src/server/configuration/index.ts`, protegido por `server-only`, é o ponto de leitura real do ambiente. Ele produz a projeção segura para as páginas e disponibiliza `requireResourceConfiguration` para futuros adaptadores de servidor. Essa função rejeita somente o recurso solicitado e não valida conexão remota.

Quando integrações forem implementadas, os casos de uso de cada funcionalidade devem depender de contratos próprios; os adaptadores concretos ficam em `src/server/providers`. As rotas e casos de uso de servidor compõem essas dependências. Não passe credenciais ou clientes privilegiados para componentes de UI.

## Fronteiras de execução

- Server Components: layout, páginas, catálogo e apresentação estática dos requisitos de configuração.
- Client Components: navegação, cabeçalho interativo, Sheet, abas e interface de prospecção. As páginas continuam no servidor e passam dados explicitamente ao limite interativo.
- A camada SQL possui operações protegidas, consumidas pela autenticação, perfil e administração de workspaces. O módulo comercial do CRM ainda não está conectado à interface de prospecção. Validação/autorização de Auth/workspace ocorrem em cada operação, além do RLS.
- Não existe fallback para resultados demonstrativos. Estados de ausência de configuração não representam consultas vazias aos provedores.
- O SDK Supabase é usado no servidor e, para eventos de sessão, no limite cliente autenticado. Não há fontes remotas nem SDKs Google/OpenAI carregados. O mapa local demonstrativo é importado sob demanda na visualização Mapa, sem carregar o Google Maps.

O lint restringe importações de servidor via alias na UI, permitindo somente os dois módulos `use server` de Server Actions, e bloqueia dependências de framework no domínio. Essa regra auxilia a revisão; o bloqueio de segredos no grafo cliente vem de `server-only`, da fronteira de ações e da projeção explícita.

## Limites da etapa

Não há provedor fake no runtime. Fixtures de contratos HTTP existem exclusivamente em `tests/support`. O envio administrativo de convite Auth possui adaptador com chave secreta opcional e autorização prévia; operações comuns usam a sessão do usuário. Executor de tarefas e integrações comerciais continuam fora desta etapa. Antes de cada provedor, verificar API e permissões conforme `AGENTS.md`.

A tela de configurações desta fundação só expõe nomes públicos de configuração e estados de formato. Qualquer futura alteração de configuração ou exposição de diagnóstico operacional restrito exigirá autenticação e autorização adequadas.

## Interface e responsividade

Tema escuro, superfícies, bordas, textos e tokens de estados ficam em `globals.css`. A composição da aplicação e da prospecção fica em `prospecting.css`. Os componentes shadcn/ui incorporados são Button, Badge, Card e Sheet, com um wrapper local de Tabs sobre Radix. Os controles principais têm alvos de toque de 44 px. Navegação desktop usa coluna lateral de 238 px; em mobile usa Sheet com foco gerenciado por Radix. Nenhuma ação exige hover.

As páginas usam grids fluidas, colunas com mínimo zero, quebra de nomes, altura dinâmica e áreas seguras. A prospecção mostra filtros e mapa no centro, tabela abaixo e painel direito de 335 px a partir de 1280 px. Abaixo disso, detalhes/mensagens ficam em drawer. No celular, filtros são expansíveis e resultados viram cards. Tabelas rolam localmente. Auth usa `auth.css`, formulários com campos de 48 px e rolagem vertical, sem limitar a altura da página; não há Kanban nesta etapa.

## Demonstração explícita — etapa 2

`/` redireciona para `/prospeccao`, que recebe uma lista vazia e mostra métricas desconhecidas como “—”, sem confundir ausência de integração com uma consulta de zero resultados. Nenhuma credencial aciona demonstração automaticamente. O usuário entra na rota `/prospeccao/demonstracao` por um link explícito; a rota de servidor importa somente então as fixtures sintéticas e as passa à interface. O catálogo técnico anterior foi preservado em `/base` e configurações em `/configuracoes`.

As regras puras de pesquisa e o contrato da empresa estão em `src/features/prospeccao/domain/company.ts`. Não dependem de Google Places, Supabase ou rede. `src/demo/prospect-companies.ts` contém apenas dados sintéticos e referências a assets locais. `ProspectingScreen` coordena estado de filtros, empresa selecionada, leads de exemplo, notas e mensagens em memória; componentes menores cuidam de filtros, tabela/cards, detalhes, mensagem e mapa. Não há armazenamento em navegador ou banco, nem API simulada que se apresente como provedor real.

Mensagens são templates locais identificados como exemplos não gerados por IA. A área permite editar e copiar, sem enviar. A coluna de site mostra apenas domínios `.example`, sem links externos. Não há telefones nas fixtures. Controles dependentes de integrações ou de etapas futuras explicam sua indisponibilidade, sem simular sucesso.

O carregamento sob demanda usa `next/dynamic` dentro do limite cliente. Radix Tabs fornece navegação por teclado; Sheet gerencia o modal e a aplicação devolve foco ao acionador ao fechar detalhes. Cada instância da área de texto usa `useId`, evitando IDs duplicados entre a coluna desktop e o drawer.

## Persistência multiworkspace

`supabase/migrations` é a fonte do schema, RLS, constraints e operações autorizadas. Todas as tabelas de aplicação expostas usam RLS; associações entre entidades incluem o workspace nas FKs. Papéis de workspace não vêm de metadata editável do usuário. Helpers e funções privilegiadas ficam em schema privado com `search_path` fixo e execução restrita; wrappers públicos são invoker.

CRM próprio, referências de provedores e aprovação de políticas são separados. Google está bloqueado no produto, inclusive para novos identificadores; referências legadas ficam ocultas sem exclusão automática. Dados próprios/licenciados exigem permissão por finalidade/campo/ação e proveniência. Não existe tabela de payloads externos. Histórico identifica autoria/processo; `user_input` não comprova propriedade.

`scripts/db/database.mjs` é um harness de desenvolvimento que aplica os mesmos SQLs em PostgreSQL embarcado. Não é importado pela aplicação ou usado como backend. O schema mínimo de Auth usado nele não faz parte de nenhuma migração. `scripts/db/generate-types.mjs` extrai o schema público do catálogo executado e gera `src/lib/supabase/database.types.ts`, verificável por hash e introspecção.

Seeds/testes são sintéticos e separados da demonstração. Clientes Supabase distintos ficam em `src/lib/supabase/browser.ts` e `src/server/providers/supabase/server.ts`; o cliente administrativo de convites permanece isolado. Nenhuma chave privilegiada é usada em operações comuns. Bootstrap e limites: `BANCO-DE-DADOS.md`, `VALIDACAO-BANCO.md` e `VALIDACAO-AUTH.md`.

## Auth, rotas e sessão

O layout raiz mantém somente idioma/tema/estilos e atalho de conteúdo. O grupo `(platform)` verifica identidade no servidor e compõe `PlatformShell` com identificação mínima. O grupo `(demo)` preserva a demonstração pública; `(auth)` contém telas públicas e a redefinição protegida por identidade própria. `src/proxy.ts` renova cookies e faz encaminhamento inicial; páginas de tenant e Server Actions continuam verificando autorização independentemente.

`src/domain/auth.ts` centraliza validação de senha, e-mail, UUID, origem e destinos permitidos. `src/server/auth` contém leitura tardia de configuração, origem, identidade, associações e ações. `src/features/auth` contém somente apresentação/estados de formulários e eventos de sessão; não acessa dados privilegiados. A associação é consultada pelo JWT do usuário em cada operação, nunca derivada de metadata ou do UUID no cookie.

Autenticação e páginas privadas são dinâmicas e não usam cache compartilhado. Cookies Supabase são gerenciados pelo SSR, com Secure em HTTPS e SameSite Lax; o cookie de seleção de workspace é HTTPOnly, e nunca concede poderes. A documentação operacional de callbacks/convites está em `AUTENTICACAO.md`.

## Contratos de integração e direitos

`src/domain/integrations` contém contratos estritos, política por provedor, flags, licenças e proveniência por campo com ancestrais. `src/server/integrations` verifica identidade/associação por operação, resolve registros/evidências do workspace e prepara planos autorizados. Os DTOs de UI fornecem IDs, não alegações de propriedade ou JSON bruto de provedores. Copiar/derivar ou transportar para Supabase não muda a origem; toda a árvore participa da decisão e do menor prazo de retenção.

O catálogo próprio/licenciado recebe dados explícitos do registro privado de operador, lido de `OWNED_CATALOG_FILE` no servidor e validado por `catalogManifestSchema`. Busca livre, nicho, palavra-chave e detalhes operam por `POST /api/prospeccao` com identidade, associação, origem e política verificadas em cada ação. Localidades são resolvidas por ID da mesma fonte; distâncias usam apenas coordenadas aprovadas. O serviço limita páginas/resultados, deadlines e concorrência por processo. A demonstração fica em `src/demo/integrations`, sem fallback nos provedores reais. Auditoria e mensagens continuam pendentes e sem rede/resultados sintéticos. Persistência é um plano sem escrita; gestão de evidências em PostgreSQL continua pendente. Limites e configuração: `docs/BUSCA-DE-EMPRESAS.md`.

Todas as flags começam fechadas e não ultrapassam o teto da política. Google fica bloqueado mesmo com flags/chaves; a migração 006 reforça a barreira do banco. Regras, fontes oficiais e configurações: `docs/integracoes.md`.

Auditorias possuem execução própria em `src/server/audits` e adaptador PSI v5, reutilizando o contrato de métricas e o catálogo de operador. A migração 007 reaproveita async_jobs e reservas/contadores, adiciona somente metadados privados e hash de credencial de executor; sem persistir URL/relatório PSI. As operações usam JWT comum e prova do backend nas mutações, com associação/identidade revalidadas. O handler aguarda a execução e a conclusão no banco; lease/expiração resolvem interrupções sem fila em memória. Exibição da resposta depende de evidência para os dois campos de auditoria; arquivo/CSV/IA continuam negados. Regras, configuração e limites: `docs/AUDITORIAS.md`. A porta legada de preparação não é a implementação operacional; a conexão PSI real ainda não foi configurada/verificada.
