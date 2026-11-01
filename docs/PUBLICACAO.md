# Publicação — AG Prospecção

Preparação em 30/10/2026. Destino indicado pelo usuário e acesso de escrita confirmados: [AndersonGehrkeDev/Ag-Captura-de-Leeds](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds). O repositório encontrado é público e estava vazio; sua visibilidade foi preservada. Commit inicial da aplicação: `b8468f2`.

**Atualização inicial de 31/10/2026 (histórico):** usuário esclareceu uso próprio não comercial. Projeto Vercel existente `ag-captura-de-leed` e integração Supabase foram encontrados e preservados. Publicada a correção de origem em [https://ag-captura-de-leed.vercel.app](https://ag-captura-de-leed.vercel.app), deploy `dpl_7w2grt96ALWDxrBxm2xJXWpPDJuv` Ready. Naquele momento somente hospedagem/rotas públicas estavam conferidas; a conclusão posterior está abaixo. As instruções comerciais de preparação só se aplicam se houver uso comercial futuro.

**Configuração concluída após autorização em 31/10/2026:** a base inicialmente ligada à Vercel pertencia a outro sistema, com tabelas incompatíveis. Ela foi preservada. Criado **`omvbcuistwursfjopzmb` / `ag-prospeccao`**, Free, sa-east-1, PostgreSQL **17.11**; aplicadas somente as dez migrações pendentes e conferida correspondência local/remota. Workspace AG ativo, proprietário administrativo e executor CRM configurados. Novo deploy **`dpl_DTfoUj1acVfxxRKPtThfS7ADmBxL`**, Ready, Node 22.x. **Login com senha, abertura da prospecção autenticada e salvar/reler um registro CRM passaram em produção.** A recuperação por e-mail/definição da senha pelo usuário não foi executada.

Primeiro acesso do usuário: [Recuperar acesso](https://ag-captura-de-leed.vercel.app/recuperar-senha), usando o e-mail da identidade Supabase autorizada; iniciar e abrir o link no mesmo navegador (PKCE). A senha operacional do bootstrap não é publicada. Templates nativos mantidos, pois Free com provedor padrão recusou personalização; nenhum SMTP/upgrade foi contratado. Preview, fontes externas, auditorias e IA continuam com pendências próprias.

## Situação verificada

| Item | Evidência / estado |
| --- | --- |
| Aplicação local | Resultados do [Prompt 13](VALIDACAO-CONSOLIDADA.md) reutilizados; nenhum módulo de runtime alterado nesta preparação |
| Credenciais no Git | `.gitignore` protege `.env*` exceto exemplo, `.vercel`, `.supabase`, catálogos locais, chaves e artefatos. `.env.example` contém apenas nomes, campos vazios e defaults locais/false |
| Conferência adicional | `node scripts/security/check-secrets.mjs`: padrões de segredo, arquivos privados e valores do exemplo; apenas nomes/regra em erros, sem valores. Não é certificação contra todo formato de segredo |
| GitHub | **Publicado** em `main`: `b8468f2` (aplicação), `ab8dbd8` (CI/publicação) e `eb9ee85` (origens no build de teste), pushes confirmados |
| CI | Um job com tipos/lint/build e dez casos essenciais. [Primeira execução](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41159440361): verificações e 8 casos passaram, seleção falhou por origem incorporada no build. [Reteste direcionado](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41159814737): **2 casos restantes aprovados** após corrigir o workflow |
| Vercel | Conta `lazzaribr-6231`, equipe `AndersonGehrkeDev`, Hobby mantido para uso pessoal não comercial esclarecido pelo usuário. Projeto existente reaproveitado, Node 22.x, `NEXT_PUBLIC_APP_URL` e `AUTH_ALLOW_SIGNUP=false` cadastrados em Production; novo deploy Ready |
| Supabase | Base dedicada `omvbcuistwursfjopzmb`, Free/sa-east-1/PG17.11; dez migrações, 22 tabelas públicas com RLS, owner/workspace ativos e hash CRM. Projeto anterior `gajopgslkyhsnsehcrob` é de outro sistema e não recebeu migrações/configuração AG |
| Google | Sem projeto/chaves acessíveis; APIs Places/Maps continuam bloqueadas pela política. Nenhuma API ativada ou chave exposta |
| Deploy / URLs | Production: **https://ag-captura-de-leed.vercel.app**. Login, prospecção autenticada e persistência CRM aprovados. Primeiro acesso via recuperação e Preview seguem sem verificação/configuração própria |

Os arquivos publicáveis foram conferidos antes do commit/push. Há uma exceção exata no scanner para a chave fictícia do teste que recusa chave privilegiada no cliente; outros valores no mesmo arquivo continuam bloqueados. Seeds e fixtures sintéticas continuam exclusivas de desenvolvimento/testes; não são configuração de produção.

## CI sem repetição de baterias

- Um job Ubuntu, Node **22.13.0**, `npm ci`, Actions oficiais fixadas por SHA, permissões `contents: read` e checkout sem credencial persistida.
- Tipos, lint e build executados uma vez por execução; quatro testes de serviço, três verificações SQL e três Chromium. A `.next` gerada é reutilizada pelos servidores dos testes. Nenhum `npm run check`, suíte inteira ou matriz de navegadores.
- Push somente em `main`, PRs e execução manual; push em branch de PR não cria um segundo workflow de push. Concurrency cancela execução obsoleta. Segredos de produção não são fornecidos ao job; somente loopback e fixtures.
- CI não aplica migrações, não envia e-mails, não chama APIs pagas e não faz deploy com chave privilegiada. O build necessário da Vercel instala/compila o produto, sem repetir os testes da CI.
- A execução manual pode escolher `retest_selection=true`: apenas rebuild necessário e os dois casos de seleção, com nome de job distinto. Isso **não substitui** a checagem completa obrigatória de push/PR; todos os pushes/PRs normais continuam com a bateria essencial. O modo foi acrescentado para repetir somente a falha de infraestrutura desta publicação.
- Confira o resultado em [Actions](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions). Aguarde aprovação da CI antes da primeira importação na Vercel. Para próximas mudanças, configure revisão/checagem obrigatória do job antes de merge em `main`, conforme os recursos da conta.

Resultado desta entrega: instalação/scanner/tipos/lint/build e os dez casos essenciais **passaram ao combinar a execução inicial e o reteste dos dois casos falhos**. A primeira execução continua vermelha e não foi apagada. A segunda é parcial por escolha explícita, sem repetir tipos/lint/serviços/SQL aprovados; um rebuild foi indispensável para remover a origem fixa do artefato. Commits finais só de documentação usam `[skip ci]` para não criar outra bateria. Não se declara uma nova execução integral aprovada no último SHA documental.

## Procedimento para nova instalação e pendências restantes

A Production atual já foi configurada conforme a atualização acima. Não repetir criação de projeto, migrações, troca de owner ou bootstrap apenas para entrar. Os passos abaixo servem para outra instalação/Preview ou consulta operacional; o usuário atual precisa definir sua própria senha pela recuperação.

### 1. Vercel

1. Entre no [painel da equipe Vercel](https://vercel.com/anderson-gehrke-dev) pela conta autorizada. A sessão salva inicialmente respondeu 403, mas o CLI oficial **65.9.0**, executado temporariamente via npm, renovou a autenticação e `whoami`/API passaram. Não houve dependência/lockfile do projeto alterado nem token exibido.
2. Selecione uma **equipe/plano que permita uso comercial** já contratado. Hobby é restrito a uso pessoal não comercial. Não houve contratação ou upgrade automático nesta etapa.
3. Importe o repositório indicado, diretório raiz `.`, framework Next.js, branch Production `main`, Node **22.x**. `vercel.json` fixa `npm ci` e `npm run build`; não mude para export estático, pois há SSR/Auth/Route Handlers.
4. Defina uma origem HTTPS canônica de Production e uma origem Preview fixa para uma branch controlada. Configure Preview com Supabase próprio/de teste; não conecte PRs arbitrários ao banco Production. A aplicação valida uma origem exata e não deriva callbacks de `Host`.
5. Configure as variáveis na tabela abaixo em **Settings → Environment Variables**, no ambiente correto. Segredos devem ser inseridos diretamente no painel e marcados Sensitive quando disponível. Não subir `.env.local`, tokens ou catálogo privado no Git.
6. Faça o deploy e registre URLs reais, SHA e resultado. Alterações de variáveis exigem novo deploy. Abra os testes manuais somente pela origem canônica configurada; URLs aleatórias de Preview podem ser recusadas pela verificação de Origin.

`NEXT_PUBLIC_APP_URL` é incorporada pelo Next quando definida durante o build. Faça um build por ambiente com a origem correta; não promova o mesmo artefato de Preview a Production supondo que trocar a variável de runtime corrija a origem incorporada. O workflow de testes deixa essa variável ausente no build porque exercita dois servidores locais, cada um com sua origem própria; não foi liberada uma allowlist ampla nem removido o controle de Origin.

### 2. Variáveis por ambiente

| Grupo | Preview | Production |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Origem HTTPS exata da Preview controlada | Origem HTTPS exata do domínio de produção |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Projeto Supabase de teste | Projeto Supabase Production; somente chave publicável |
| `AUTH_ALLOW_SIGNUP` | `false` | `false`, mais signup desativado no Supabase |
| `CRM_EXECUTOR_SECRET` | Segredo próprio do ambiente; SHA-256 cadastrado no `private.crm_executor_config` de teste | Outro segredo; SHA-256 cadastrado no banco Production |
| `FEATURE_OWN_DATA_PERSISTENCE` | `true` somente após migrações/hash e RLS configurados | Mesma condição; habilita cadastro manual e metadados próprios, não direitos de fonte |
| `SUPABASE_SECRET_KEY` | Opcional; convite Auth administrativo no servidor | Opcional; nunca exigida para CRUD comum de usuário |
| `FEATURE_CATALOG_SEARCH`, `FEATURE_CATALOG_DETAILS`, `OWNED_CATALOG_FILE` | Fechadas/vazio até fonte autorizada e arquivo privado disponível no runtime | Mesmo; um caminho do Windows não estará disponível na Vercel |
| `FEATURE_DATA_EXPORT` | `false` até aprovar direitos por finalidade/ancestrais | Mesmo; nenhum Google ou texto livre promovido a próprio |
| `GOOGLE_PAGESPEED_API_KEY`, `AUDIT_EXECUTOR_SECRET`, `FEATURE_WEBSITE_AUDIT` | Vazio/false até evidências, contador e hash de teste | Separados, servidor; ativar só após a configuração de [AUDITORIAS.md](AUDITORIAS.md) |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `MESSAGE_EXECUTOR_SECRET`, `FEATURE_AI_MESSAGES` | Vazio/false até evidências/modelos, contador e hash de teste | Separados, servidor; ativar só conforme [MENSAGENS-IA.md](MENSAGENS-IA.md) |
| `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `FEATURE_GOOGLE_PLACES`, `FEATURE_GOOGLE_MAPS` | Vazio/false | Vazio/false; bloqueio de produto continua aplicável |

O catálogo atual lê **arquivo privado no servidor**. `.local-data` não vai para o repositório nem é um disco persistente serverless. Não copiar a fixture nem tornar o catálogo um asset público para simular busca real. Até haver fornecimento privado seguro e inclusão deliberada no runtime, manter a busca fechada; a interface mostra indisponibilidade. Isso não impede cadastrar uma identificação interna no CRM após configurar Supabase/hash/flag.

### 3. Supabase — somente pendentes, sem reset

Autentique o CLI localmente na conta correta. Substitua os identificadores, nunca uma senha em comando versionado:

```powershell
npx.cmd supabase login
npx.cmd supabase projects list
npx.cmd supabase link --project-ref REFERENCIA_DO_AMBIENTE
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run --skip-vault
# Após conferir projeto e lista: aplica somente migrações ainda não registradas.
npx.cmd supabase db push --linked --skip-vault
npx.cmd supabase migration list --linked
```

Execute primeiro em teste/Preview e depois no Production correto, com backup disponível e revisão do dry-run. Flags conferidas na versão instalada **2.122.0**. Não usar `db reset`, `--include-seed`, `--include-all`, `--include-roles` ou `migration repair` para forçar alinhamento. Se houver histórico remoto divergente ou schema preexistente sem histórico, interromper e reconciliar explicitamente; não reaplicar todas as migrações nem executar SQL em lote às cegas. Nenhuma dessas operações remotas foi executada aqui.

Após a aplicação, confirme `private` fora da Data API, provisione o usuário Auth confirmado/owner conforme `supabase/bootstrap.sql.example`, cadastre hashes dos executores necessários e limites reais. Não executar seeds sintéticas. Verifique associação e permissões na própria sessão de usuário, sem service role no CRUD.

Em **Authentication → URL Configuration** de cada projeto, Site URL = respectiva `NEXT_PUBLIC_APP_URL`. Allowlist exata:

```text
ORIGEM_HTTPS/auth/callback?next=/workspaces
ORIGEM_HTTPS/auth/callback?next=/redefinir-senha
```

Use os templates versionados de confirmação/recuperação/convite e signup fechado, Email/confirm email e senha mínima de 12 caracteres conforme [AUTENTICACAO.md](AUTENTICACAO.md). Templates usam `.SiteURL`: projetos separados evitam e-mails de Preview apontarem a Production. Não liberar `*.vercel.app` ou origens de terceiros. URLs completas só poderão ser preenchidas após domínio e projeto reais.

### 4. Google — restrições sem liberar o caso de uso

Places/Maps continuam desativados por [integracoes.md](integracoes.md). Não criar/ativar chaves para contornar isso. Se houver chaves já existentes, o operador do projeto Cloud deve conferir uso antes de alterá-las, para não interromper outros aplicativos.

- Maps browser, caso futuramente autorizado: chave exclusiva por ambiente, restrição **Websites/HTTP referrers** aos domínios exatos controlados e restrição de API somente Maps JavaScript API. Sem wildcard geral de Preview.
- Places backend, caso futuramente autorizado: chave exclusiva do servidor, restrição à Places API (New) e restrição de aplicação/egress adequada. Referrer de navegador não protege backend; IP de saída estável não foi estabelecido na Vercel. Não declarar uma restrição IP eficaz sem verificar esse requisito, nem contratar saída fixa automaticamente.
- PSI: chave própria no servidor, API/cotas adequadas; nenhuma chave em query/log/cliente. Manter análise fechada até fonte/evidências, limites persistentes e configuração concluídos.

### 5. Tarefas e plano Vercel

Auditoria e IA já declaram `runtime=nodejs` e `maxDuration=60`. A requisição tem deadline de 50 s; PSI limita a chamada a 40 s e OpenAI a 30 s. Criar/executar/consumir usa registros transacionais no Supabase, prova do executor, idempotência e tentativa limitada. Nada continua em memória após a resposta: execução é aguardada e interrupções são recuperadas pelo lease durável na próxima ação, sem worker autônomo ou retry pago silencioso.

Com Fluid compute, os limites publicados de Hobby comportam os handlers de 60 s. Em **31/10 o usuário esclareceu uso próprio não comercial**, portanto Hobby foi mantido; a exigência anterior de plano comercial não se aplica a esse escopo. Caso o uso passe a comercial, reavaliar o plano antes de operar. Auditorias/IA continuam desativadas até configurar banco, evidências, cotas e APIs, sem supor execução garantida só por haver `maxDuration`. Nenhum cron, fila paga, upgrade ou novo executor foi contratado.

## Conferência curta após deploy

No ambiente e workspace corretos, executar somente:

1. Abrir `/login`, entrar com conta real autorizada e confirmar o workspace. Sem credenciais reais, o estado indisponível não conta como login validado.
2. Abrir `/prospeccao`, conferir origem HTTPS e estado da fonte. Não tratar demo/fixture como busca real.
3. Adicionar um lead de fonte autorizada, se disponível; caso contrário cadastrar uma **identificação interna** em `/leads`, identificando-a como verificação de publicação. Recarregar e confirmar persistência no mesmo workspace. Nunca copiar conteúdo Google para produzir esse teste.

Registrar URL, SHA, ambiente/workspace e resultado, sem senha, token ou conteúdo privado. Não executar a bateria geral novamente. Após a configuração da base dedicada em 31/10, os três passos passaram no Chromium com conta real, Supabase Auth/PostgREST/PostgreSQL 17.11 e Vercel. Criado o registro **Verificação de publicação — registro interno (31/10/2026)**, ID `eaf180f8-6bf0-40cb-8bb0-a854d2e396d8`, preservado e recuperado após reload. É uma atividade interna de verificação, sem empresa/contato externo inventado. Sessão operacional encerrada; sem trace/HAR, senha em logs ou envio de e-mail de teste.

O bootstrap administrativo criou a conta correspondente à identidade autenticada no CLI, confirmou-a administrativamente e atribuiu somente o workspace AG. Senha operacional aleatória e chaves foram protegidas por DPAPI em `.local-data`, ignoradas pelo Git. A aplicação comum recebeu apenas URL/chave publicável e prova CRM; `SUPABASE_SECRET_KEY` ficou vazio. Variáveis herdadas da base anterior foram removidas somente deste projeto Vercel. A instalação legada da integração e os outros projetos permaneceram; o CLI de marketplace não suportou alterar esse vínculo legado, portanto não foi alegada desinstalação/desconexão global.

Não executados nesta fase: nova suíte, outras larguras/navegadores, isolamento entre duas contas reais de produção, recuperação/e-mail/OTP do usuário, convites, auditoria/IA ou buscas comerciais reais. Busca própria/licenciada e permissões, credenciais/cotas PSI/IA/exportação e Preview isolada continuam pendentes. A conta Free já usa o projeto anterior e o projeto AG; não pausar/deletar o outro nem contratar terceiro projeto/branch para contornar limites sem instrução.

## Rollback curto

1. Na Vercel, em Deployments, escolher o último deploy **Ready conhecido como bom** e usar Instant Rollback/Promote conforme o plano; conferir domínio e commit. O deploy anterior `dpl_D3EJL5tLQSxKgwiDJPMzRxY9VsMN` existe, mas foi observado redirecionando para localhost: não é referência conhecida como boa para o login. Não afirmar rollback realizado ou promover uma versão apenas pelo estado Ready.
2. Reverter no Git o commit de aplicação que causou o problema com `git revert SHA_DO_COMMIT` e PR; não usar force push. Variáveis precisam de conferência própria: rollback do código não desfaz alterações de segredos/configuração automaticamente.
3. **Não reverter o banco por reset ou migração destrutiva.** Manter schema compatível e criar migração corretiva para frente; restauração de backup é decisão de incidente separada. Nenhuma migração existente foi apagada/alterada nesta etapa.

## Fontes oficiais consultadas nesta preparação

Consulta em **30/10/2026**, somente para CI/publicação e configurações necessárias: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [Vercel limites](https://vercel.com/docs/functions/limitations), [duração](https://vercel.com/docs/functions/configuring-functions/duration), [Hobby e uso comercial](https://vercel.com/docs/plans/hobby), [rollback](https://vercel.com/docs/instant-rollback), [Supabase ambientes e migrações](https://supabase.com/docs/guides/deployment/managing-environments), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) e [segurança de chaves Google](https://developers.google.com/maps/api-security-best-practices). CLI instalado também teve `db push --help` conferido; a consulta à página específica do comando não respondeu nesta sessão.

Em **31/10/2026** foram conferidos especificamente [criação de variável Vercel](https://vercel.com/docs/rest-api/projects/create-one-or-more-environment-variables), [atualização de projeto](https://vercel.com/docs/rest-api/projects/update-an-existing-project) e a regra de uso pessoal do Hobby; `vercel redeploy --help` e `supabase login --help` conferidos nos CLIs já usados. Supabase pode ser autorizado pela conexão sugerida nesta conversa ou por login no terminal local (`npx.cmd supabase login`), sem enviar tokens pelo chat. Usar exclusivamente o projeto dedicado `omvbcuistwursfjopzmb`; `gajopgslkyhsnsehcrob` pertence a outro aplicativo e deve ser preservado.
# Busca gratuita nacional — configuração adicional de 31/10/2026

Fonte ativa: `OPEN_DATA_PROVIDER=overture`, com `OPEN_DATA_CATALOG_ENABLED`, `OPEN_DATA_WORKSPACE_ID`, `OPEN_DATA_REVIEWER_ID`, `FEATURE_CATALOG_SEARCH`/`FEATURE_CATALOG_DETAILS`. Reutiliza prova CRM/hash e sessão Supabase; nenhuma chave paga. Migrações aditivas 011/012 aplicadas exclusivamente em `omvbcuistwursfjopzmb`, com histórico e dry-run antes de cada push. Nenhum reset/seeds. Consulte [fontes, limites e rollback](BUSCA-GRATUITA.md).

Vercel Hobby: handler de 60 s, deadline interno 45 s, DuckDB 256 MiB/duas threads, pacote nativo externalizado e incluído no tracing. Não depende de processamento após resposta. MapLibre/OpenFreeMap sob demanda. A opção OSM/Private.coffee expirou em produção e não é fallback automático. Validação real atual consta no acompanhamento; flags não substituem evidência de consulta.

Em **01/11/2026**, commit `904c7c6`, deployment `dpl_AoLVhCGS2dCubzCkaBmtVkXngVZK` e domínio [ag-captura-de-leed.vercel.app](https://ag-captura-de-leed.vercel.app): busca Overture, mapa, detalhes mobile e referência persistida no CRM aprovados. CI essencial [41324329259](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41324329259) aprovada. Worker/aviso BSD gerados por `prebuild` no domínio da aplicação. Sessão temporária de conferência confirmada pelo Auth, sem envio de e-mail; não comprova senha atual ou recuperação. Para desabilitar só a fonte gratuita, fechar `OPEN_DATA_CATALOG_ENABLED` e redeployar, preservando banco e CRM.
