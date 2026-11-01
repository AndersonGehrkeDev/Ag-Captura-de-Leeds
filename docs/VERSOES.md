# Versões e fontes oficiais

Consulta e implementação: **27/10/2026**, data de trabalho do cliente (America/Sao_Paulo). As versões abaixo são as efetivamente registradas em `package.json` e no lockfile. Node.js e npm correspondem ao ambiente utilizado e estão registrados nos arquivos de versão e `packageManager`.

| Componente | Versão |
| --- | --- |
| Node.js | 22.13.0 |
| npm | 10.9.2 |
| Next.js / eslint-config-next | 16.4.3 |
| React / React DOM | 19.3.1 |
| TypeScript | 5.9.3 |
| Tailwind CSS / @tailwindcss/postcss | 4.3.3 |
| PostCSS | 8.5.32 |
| shadcn CLI | 4.22.1 |
| Radix UI | 1.8.1 |
| lucide-react | 1.61.0 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| tailwind-merge | 3.7.0 |
| tw-animate-css | 1.4.0 |
| Zod | 4.6.7 |
| server-only | 0.0.1 |
| OpenAI SDK `openai` | 7.45.1 (adicionado em 30/10/2026) |
| ESLint | 9.39.5 |
| Vitest | 5.0.5 |
| @playwright/test | 1.64.1 |
| @types/node | 22.13.0 |
| @types/react / @types/react-dom | 19.3.0 |

Dependências diretas têm versões exatas; transitivas são fixadas por `package-lock.json`. Use `npm ci` para reproduzir a árvore. Não foi utilizado create-next-app: a fundação foi criada manualmente para preservar os documentos existentes. O shadcn CLI foi executado pela versão local fixada, com `add button card badge sheet --yes`, estilo `new-york`, RSC habilitado e Tailwind CSS com variáveis de tema.

## Decisões de compatibilidade

Next.js 16.4.3 aceita React 19 no peer declarado pelo pacote. O ambiente Node 22.13.0 também atende aos requisitos dos runners e do CLI selecionados. TypeScript 5.9.3 é uma versão estável adotada conservadoramente para o ecossistema do projeto; não foi escolhida simplesmente a maior versão publicada. A compatibilidade efetiva foi verificada com tipos e build.

ESLint 9.39.5 foi mantido porque os plugins `eslint-plugin-import`, `eslint-plugin-jsx-a11y` e `eslint-plugin-react` trazidos pelo `eslint-config-next` selecionado declaram suporte ao ESLint 9, mas não ao 10. O registro npm emite aviso de fim de suporte dessa linha. A troca para ESLint 10 exige atualizar o conjunto de plugins para versões compatíveis; não se usou `--force`, `--legacy-peer-deps` nem overrides para esconder conflitos. Essa atualização é uma pendência de manutenção registrada, sem impedir o lint atual.

O ambiente de execução foi preservado; não se alterou a instalação global do usuário. Ao atualizar o patch do Node ou qualquer ferramenta, atualizar também os arquivos de versão e repetir os checks.

## Fontes oficiais consultadas

- [Instalação e requisitos do Next.js](https://nextjs.org/docs/app/getting-started/installation): App Router, scripts, Node e instalação manual.
- [Server e Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components): fronteiras de execução e módulos de servidor.
- [ESLint com Next.js](https://nextjs.org/docs/app/api-reference/config/eslint): flat config e execução separada do build.
- [Suporte de versões do ESLint](https://eslint.org/version-support/): situação de manutenção da linha 9 e atualização pendente do conjunto de plugins.
- [Variáveis de ambiente no Next.js](https://nextjs.org/docs/app/guides/environment-variables): variáveis publicáveis e comportamento no build.
- [Instalação Tailwind com PostCSS](https://tailwindcss.com/docs/installation/using-postcss): plugin PostCSS e importação CSS.
- [Instalação manual shadcn/ui](https://ui.shadcn.com/docs/installation/manual) e [CLI](https://ui.shadcn.com/docs/cli): configuração e incorporação de componentes.
- [Vitest com Next.js](https://nextjs.org/docs/app/guides/testing/vitest) e [guia Vitest](https://vitest.dev/guide/): runner e configuração; nesta etapa o ambiente é Node, pois os testes unitários são de regras puras.
- [Configuração do Playwright](https://playwright.dev/docs/test-configuration): servidor de testes, navegador e evidências.
- Metadados oficiais do registro npm consultados por `npm.cmd view <pacote> version engines --json` e `npm.cmd view <pacote> peerDependencies --json`, incluindo [Next.js](https://registry.npmjs.org/next/16.4.3), [eslint-config-next](https://registry.npmjs.org/eslint-config-next/16.4.3) e [ESLint](https://registry.npmjs.org/eslint/9.39.5).

## Estado das integrações ao encerrar a etapa 1 (histórico)

Supabase Auth/PostgreSQL/RLS, Google Places API (New), Maps JavaScript API, PageSpeed Insights e OpenAI têm somente requisitos de configuração descritos. Não há SDK, endpoint chamado nem modelo OpenAI escolhido a registrar como integração executada. Na etapa de cada integração, consultar suas condições e documentação oficial, registrar as versões/endpoints efetivamente adotados e atualizar este documento e o lockfile.

## Etapa 2 — interface de prospecção

Nenhuma dependência nova nem atualização de versão foi necessária. `package.json` e `package-lock.json` foram preservados. Foi adicionado um wrapper de Tabs personalizado sobre os primitives da versão Radix já instalada; Button, Sheet e os tokens existentes foram reutilizados e ajustados ao mockup.

Fontes oficiais consultadas em 27/10/2026:

- [Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs): composição, controle de estado e navegação por teclado.
- [Lazy loading no Next.js](https://nextjs.org/docs/app/guides/lazy-loading): importação sob demanda de componente cliente com `next/dynamic`.
- Documentação instalada em `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: preservação das fronteiras de servidor e cliente.

Imagem gerada e mapa local não representam SDKs instalados ou integrações remotas; a procedência está em `ASSETS-ETAPA-2.md`.

## Etapa do banco — 27/10/2026

| Ferramenta/engine | Versão efetivamente adotada |
| --- | --- |
| Supabase CLI (devDependency) | 2.122.0 |
| @electric-sql/pglite (devDependency) | 0.5.12 |
| PostgreSQL executado no teste PGlite | 18.6, observado por `select version()` |
| PostgreSQL do config local Supabase | major 17, padrão do CLI; não executado aqui por ausência de runtime Docker/Podman |

As duas dependências novas foram selecionadas pelo registro oficial npm (`npm.cmd view ... version engines --json`), instaladas com versões exatas e registradas no lockfile. Não houve troca de gerenciador de pacotes ou instalação global. PGlite é usado somente em ferramentas de desenvolvimento, sem importação ou banco embutido no navegador da plataforma.

Não foi possível validar os componentes/patches da stack Supabase hospedada ou local completa. Na entrega do banco ainda não havia SDK de aplicação Supabase; a etapa de Auth abaixo o adiciona. A geração local de tipos é por catálogo do banco migrado, não uma alegação de execução bem-sucedida do gerador oficial do CLI.

Fontes oficiais consultadas: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções](https://supabase.com/docs/guides/database/functions), [migrações](https://supabase.com/docs/guides/local-development/database-migrations), [geração de tipos](https://supabase.com/docs/guides/api/rest/generating-types), [seeds](https://supabase.com/docs/guides/local-development/seeding-your-database), [runtimes](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes) e [PGlite](https://pglite.dev/docs/). Os comandos `supabase --version`, `init`, `start --help` e `gen types --help` também foram verificados na ferramenta instalada.

## Etapa de autenticação — 27/10/2026

| Dependência nova | Versão exata | Compatibilidade |
| --- | --- | --- |
| `@supabase/ssr` | 0.12.7 | Peer `@supabase/supabase-js ^2.114.0` |
| `@supabase/supabase-js` | 2.118.0 | Node >=22; atendido pelo Node 22.13.0 existente |

Versões estáveis consultadas no registro oficial npm e instaladas sem `--force`/overrides, com atualização do único `package-lock.json`. Next/React/TypeScript/Tailwind/UI foram preservados. `npm.cmd ls @supabase/ssr @supabase/supabase-js --depth=0` confirmou ambas as versões; instalação reproduzível por `npm.cmd ci --offline --cache .npm-cache --no-fund` concluída após liberar arquivo SWC que estava em uso pelo servidor dev. Nenhuma instalação global foi alterada.

O serviço utilizado é **Supabase Auth HTTP `/auth/v1`**, com login/senha, OTP/token hash e troca PKCE; a Data API continua em `/rest/v1` com JWT de usuário e RLS. Não foi inventada uma versão do serviço hospedado. A versão da stack GoTrue/PostgREST real ainda não foi observada/validada, pois nenhum projeto real foi conectado.

A implementação segue a API de `cookies()` assíncrona e `src/proxy.ts` do Next 16 instalado, com `getAll/setAll` do SSR, transporte dos cookies renovados e cabeçalhos privados. Escolheu-se `getUser` para verificar identidade no servidor; não há autorização por `getSession`. Documentação e configuração operacional: [AUTENTICACAO.md](AUTENTICACAO.md).

Fontes oficiais desta consulta: [pacote SSR 0.12.7](https://registry.npmjs.org/@supabase/ssr/0.12.7), [supabase-js 2.118.0](https://registry.npmjs.org/@supabase/supabase-js/2.118.0), [SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [guia avançado](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [senhas](https://supabase.com/docs/guides/auth/passwords), [templates](https://supabase.com/docs/guides/auth/auth-email-templates) e [Proxy Next](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). Também foram lidos os tipos/código de cookies do SSR e a documentação local em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

## Contratos e políticas — 27/10/2026

Nenhuma dependência foi instalada/atualizada e o lockfile foi preservado. Contratos internos em versão `1`; política de dados `2026-10-27.1`. Esses números são revisões internas, não versões fictícias de SDK/API. Google Places New (`v1`), Maps JavaScript API, PageSpeed (`v5`) e OpenAI Responses são referências de interfaces futuras; nenhum SDK comercial novo foi incorporado ou endpoint real chamado nesta etapa. O modelo OpenAI continua sem escolha fictícia.

Fonte das decisões atuais, endpoints e links oficiais consultados: [integracoes.md](integracoes.md). A migração 006 e os tipos gerados refletem o bloqueio do caso de uso Google; a exceção de cache de IDs não equivale a permissão de produto. Verificações da etapa: `npm run check` com 113 unitários/74 SQL, além da regressão de navegador registrada no acompanhamento.

## Busca em catálogo autorizado — 28/10/2026

Dependências e lockfile preservados; nenhuma instalação/atualização de SDK. Contrato interno **2**, manifesto de catálogo **1**, política de direitos **2026-10-27.1**. O adaptador usa `node:fs/promises` / `node:crypto` do Node 22.13.0 já adotado; não é uma versão de API Google. Route Handler, AbortSignal/cookies e proxy usam o Next 16.4.3 existente; foi consultada a referência empacotada `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.

Fontes técnicas Google foram revisadas novamente em 28/10/2026 e registradas em [integracoes.md](integracoes.md). Google/Geocoding continuam não conectados. A fonte operacional é um arquivo privado de operador, não um fornecedor externo inventado. Evidências dos testes e pendências reais: [VALIDACAO-BUSCA.md](VALIDACAO-BUSCA.md).

## Auditoria de sites — 28/10/2026

Nenhum pacote instalado ou atualizado; lockfile e stack preservados. Implementado adaptador REST **PageSpeed Insights v5**, sem SDK adicional, usando fetch/AbortSignal, DNS/net e crypto do Node 22.13.0 existente. `maxDuration=60` no Next 16.4.3; suporte real depende da configuração/plano Vercel. Política **2026-10-28.1** acrescenta exibição condicionada de recomendações, mantendo persistência/exportação/IA PSI bloqueadas. Regra comercial AG **v1**, separada de Lighthouse; nenhuma versão de Lighthouse foi instalada/assumida para produção, a versão retornada é exibida quando disponível.

A migração 007 foi aplicada no PostgreSQL 18.6/PGlite de teste e os tipos foram regenerados: 22 tabelas públicas, 12 funções e 8 enums. Somente dois fluxos de auditoria foram executados com respostas sintéticas, além de tipos/lint direcionado; suíte completa/build/browser ficam para o Prompt 13. Fontes oficiais e pendências de header/seletor/conexão real: [AUDITORIAS.md](AUDITORIAS.md).

## OpenAI Responses — 30/10/2026

Adotado o SDK oficial `openai` **7.45.1**, versão estável consultada por `npm.cmd view openai version engines --json --offline=false` e instalada com `npm.cmd install --save-exact openai@7.45.1 --offline=false --no-audit --no-fund`. Requisito declarado Node >=22.0.0, compatível com Node 22.13.0 do projeto. Um pacote direto acrescentado, sem agentes/frameworks/ferramentas extras; npm e package-lock preservados. As versões de Next/React/TypeScript/Tailwind/Zod e UI não mudaram.

API REST **Responses `/v1/responses`** pelo SDK, `responses.parse` e `zodTextFormat`, compatibilidade com Zod 4.6.7 verificada por geração sintética no SDK instalado. Modelo configurado por `OPENAI_MODEL`, sem padrão automático ou disponibilidade de conta presumida. Sem retries automáticos; teto de 600 tokens, store/background false. Fontes oficiais abertas: [SDKs](https://developers.openai.com/api/docs/libraries), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) e [controles de dados](https://developers.openai.com/api/docs/guides/your-data). O último controle não equivale a retenção zero; detalhes em [MENSAGENS-IA.md](MENSAGENS-IA.md).

Verificação direcionada: instalação, tipos gerados por oito migrações (22 tabelas públicas/13 funções/8 enums), typecheck, lint dos módulos alterados e **duas fixtures aprovadas** (geração e erro 429). Nenhuma chamada paga/OpenAI real, npm ci completo, build, suíte consolidada ou navegador foi executado nesta etapa; os checks amplos continuam para o Prompt 13.

## CRM — 30/10/2026

Nenhum pacote foi instalado ou atualizado nesta etapa. Next.js, Supabase SSR/SDK, TypeScript, Tailwind, shadcn/Radix e testes existentes foram reutilizados. Migração SQL 009 acrescenta valores ao enum lead_stage e metadados/vínculos privados do CRM. Tipos TypeScript regenerados por introspecção das nove migrações: 22 tabelas públicas, 14 funções, 8 enums (lead_stage agora contém oito etapas). Fonte de schema: supabase/migrations; não houve mudança de geração/endpoint de API externa.

Verificações direcionadas: typecheck, ESLint dos módulos alterados e três fluxos do CRM em fixtures/PGlite (adicionar, mudar etapa e persistir anotação), sem suíte completa ou API real. Decisões e configuração: [CRM.md](CRM.md). Não houve nova pesquisa externa sem necessidade ou mudança de lockfile nesta etapa.

## Paginas do menu - 30/10/2026

Sem pacotes novos ou mudancas de lockfile. Reutilizados Next App Router/Server Components, Supabase SSR/SDK, RLS, Zod, componentes shadcn/Radix, mapa local, Auth/perfil/workspaces/convites, CRM e politica existentes. Migracao 010 acrescenta somente triggers privados para a preferencia Nao contatar em campanhas; permanecem 22 tabelas publicas, 14 funcoes publicas e 8 enums nos tipos gerados pelas dez migracoes.

Verificacao direcionada: typecheck e lint dos modulos tocados aprovados; um caso de navegacao/acoes no Chromium com fixture HTTP/Auth/RLS/PGlite aprovado. Sem pesquisa externa, instalacao, APIs pagas, build ou suite consolidada. Comandos, escopos e limitacoes: [PAGINAS-DO-MENU.md](PAGINAS-DO-MENU.md).

## Publicação real — 31/10/2026

Supabase dedicado `ag-prospeccao`, Free, sa-east-1: **PostgreSQL 17.11**, confirmado por `current_setting('server_version')`, com as dez migrações e 22 tabelas públicas RLS. CLI Supabase **2.122.0**, Vercel CLI **65.9.0** temporário via npm e runtime Vercel **22.x**. SDKs/pacotes/lockfile da aplicação não foram alterados. A versão PGlite 18.6 dos testes anteriores continua sendo somente o harness; não é a versão remota.

Configuração pela API oficial [projetos](https://supabase.com/docs/reference/api/v1-create-a-project), [Auth](https://supabase.com/docs/reference/api/v1-update-auth-service-config), [PostgREST](https://supabase.com/docs/reference/api/v1-update-postgrest-service-config) e [chaves](https://supabase.com/docs/reference/api/v1-get-project-api-keys), consultadas para essa operação. Organização Free confirmada antes de criar a segunda base; sem upgrade/compute extra/SMTP contratado. E-mail padrão do Free recusou personalização de templates, mantidos nativos. Login real e salvar/reler registro CRM passaram na Vercel; resultados e limites em [PUBLICACAO.md](PUBLICACAO.md).
# Integração gratuita adicional — 31/10/2026

- `maplibre-gl` **6.16.0**, dependência direta fixada e lockfile atualizado; [documentação oficial](https://maplibre.org/maplibre-gl-js/docs/), [instalação OpenFreeMap](https://openfreemap.org/quick_start/). React/Next mantidos. Nenhum SDK pago, pacote Google ou framework de agentes foi adicionado.
- OpenFreeMap: estilo vetorial `https://tiles.openfreemap.org/styles/dark`; serviço sem versão de SDK própria.
- OpenStreetMap: Overpass QL via POST `https://overpass.private.coffee/api/interpreter`; API externa, não versão de pacote npm. [Termos do operador](https://overpass.private.coffee/).
- IBGE Localidades API **v1**, lista de municípios normalizada em 31/10/2026; [documentação](https://servicodados.ibge.gov.br/api/docs/localidades).
- Fonte ativa após falha real da Private.coffee: **Overture Places 2026-10-21.0**, acesso anônimo ao GeoParquet público, sem API de créditos. [Licenças por fonte](https://docs.overturemaps.org/attribution/#places). Overpass fica alternativa explícita inativa, sem fallback automático.
- `@duckdb/node-api` e bindings **1.5.6-r.2**, runtime DuckDB **1.5.6**, MIT, fixados no lockfile; [cliente oficial Neo 1.5](https://duckdb.org/docs/1.5/clients/node_neo/overview). httpfs oficial assinado da mesma versão; binário da plataforma incluído no tracing da API. Node 22 preservado.
- IBGE Malhas **v3**, GeoJSON simplificado usado para caixa envolvente; [documentação oficial](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3). Sem geocoding pago ou pretensão de teste exato de divisa.
- Em 01/11/2026: snapshot local de 5.571 caixas do IBGE; complemento [MT 2025](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/UFs/MT/). Extensão `spatial` oficial assinada **1.5.6**, somente na ferramenta local de atualização; não carregada no runtime de busca. Evita chamada IBGE por consulta na Vercel.
