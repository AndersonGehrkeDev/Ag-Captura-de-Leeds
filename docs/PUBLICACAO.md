# Publicação — AG Prospecção

Preparação em 30/10/2026. Destino indicado pelo usuário e acesso de escrita confirmados: [AndersonGehrkeDev/Ag-Captura-de-Leeds](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds). O repositório encontrado é público e estava vazio; sua visibilidade foi preservada. Commit inicial da aplicação: `b8468f2`.

## Situação verificada

| Item | Evidência / estado |
| --- | --- |
| Aplicação local | Resultados do [Prompt 13](VALIDACAO-CONSOLIDADA.md) reutilizados; nenhum módulo de runtime alterado nesta preparação |
| Credenciais no Git | `.gitignore` protege `.env*` exceto exemplo, `.vercel`, `.supabase`, catálogos locais, chaves e artefatos. `.env.example` contém apenas nomes, campos vazios e defaults locais/false |
| Conferência adicional | `node scripts/security/check-secrets.mjs`: padrões de segredo, arquivos privados e valores do exemplo; apenas nomes/regra em erros, sem valores. Não é certificação contra todo formato de segredo |
| GitHub | **Publicado** em `main`: `b8468f2` (aplicação), `ab8dbd8` (CI/publicação) e `eb9ee85` (origens no build de teste), pushes confirmados |
| CI | Um job com tipos/lint/build e dez casos essenciais. [Primeira execução](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41159440361): verificações e 8 casos passaram, seleção falhou por origem incorporada no build. [Reteste direcionado](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions/runs/41159814737): **2 casos restantes aprovados** após corrigir o workflow |
| Vercel | Sessão renovada pelo CLI oficial; conta `lazzaribr-6231`, equipe `AndersonGehrkeDev` (`anderson-gehrke-dev`), **plano Hobby** confirmado. Sem plano comercial disponível ou projeto desta aplicação; nenhum deploy/variável criado |
| Supabase | CLI respondeu **Access token not provided**; sem projeto vinculado. Nenhuma migração remota, callback ou variável alterado |
| Google | Sem projeto/chaves acessíveis; APIs Places/Maps continuam bloqueadas pela política. Nenhuma API ativada ou chave exposta |
| Deploy / URLs | **Nenhum deploy Vercel confirmado. Não existe URL Preview/Production a entregar nesta preparação** |

Os arquivos publicáveis foram conferidos antes do commit/push. Há uma exceção exata no scanner para a chave fictícia do teste que recusa chave privilegiada no cliente; outros valores no mesmo arquivo continuam bloqueados. Seeds e fixtures sintéticas continuam exclusivas de desenvolvimento/testes; não são configuração de produção.

## CI sem repetição de baterias

- Um job Ubuntu, Node **22.13.0**, `npm ci`, Actions oficiais fixadas por SHA, permissões `contents: read` e checkout sem credencial persistida.
- Tipos, lint e build executados uma vez por execução; quatro testes de serviço, três verificações SQL e três Chromium. A `.next` gerada é reutilizada pelos servidores dos testes. Nenhum `npm run check`, suíte inteira ou matriz de navegadores.
- Push somente em `main`, PRs e execução manual; push em branch de PR não cria um segundo workflow de push. Concurrency cancela execução obsoleta. Segredos de produção não são fornecidos ao job; somente loopback e fixtures.
- CI não aplica migrações, não envia e-mails, não chama APIs pagas e não faz deploy com chave privilegiada. O build necessário da Vercel instala/compila o produto, sem repetir os testes da CI.
- A execução manual pode escolher `retest_selection=true`: apenas rebuild necessário e os dois casos de seleção, com nome de job distinto. Isso **não substitui** a checagem completa obrigatória de push/PR; todos os pushes/PRs normais continuam com a bateria essencial. O modo foi acrescentado para repetir somente a falha de infraestrutura desta publicação.
- Confira o resultado em [Actions](https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds/actions). Aguarde aprovação da CI antes da primeira importação na Vercel. Para próximas mudanças, configure revisão/checagem obrigatória do job antes de merge em `main`, conforme os recursos da conta.

Resultado desta entrega: instalação/scanner/tipos/lint/build e os dez casos essenciais **passaram ao combinar a execução inicial e o reteste dos dois casos falhos**. A primeira execução continua vermelha e não foi apagada. A segunda é parcial por escolha explícita, sem repetir tipos/lint/serviços/SQL aprovados; um rebuild foi indispensável para remover a origem fixa do artefato. Commits finais só de documentação usam `[skip ci]` para não criar outra bateria. Não se declara uma nova execução integral aprovada no último SHA documental.

## Passos manuais indispensáveis por falta de acesso

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

Com Fluid compute, os limites publicados de Pro comportam 60 s. A equipe encontrada usa **Hobby**, que também comporta esse tempo tecnicamente com Fluid compute, porém **não permite este uso comercial**. A compatibilidade de produção continua condicionada a plano comercial e verificação de Fluid compute/timeout efetivo, conexão com o banco e disponibilidade das APIs. Não reduzir para Edge nem assumir execução garantida por ter uma linha `maxDuration`. Não foi adicionado cron, fila paga ou novo executor. Até haver plano/configuração adequados, manter flags fechadas; nenhum upgrade foi contratado.

## Conferência curta após deploy

No ambiente e workspace corretos, executar somente:

1. Abrir `/login`, entrar com conta real autorizada e confirmar o workspace. Sem credenciais reais, o estado indisponível não conta como login validado.
2. Abrir `/prospeccao`, conferir origem HTTPS e estado da fonte. Não tratar demo/fixture como busca real.
3. Adicionar um lead de fonte autorizada, se disponível; caso contrário cadastrar uma **identificação interna** em `/leads`, identificando-a como verificação de publicação. Recarregar e confirmar persistência no mesmo workspace. Nunca copiar conteúdo Google para produzir esse teste.

Registrar URL, SHA, ambiente/workspace e resultado, sem senha, token ou conteúdo privado. Não executar a bateria geral novamente. Estes três passos **não foram executados remotamente**, pois não há deploy/Supabase acessíveis.

## Rollback curto

1. Na Vercel, em Deployments, escolher o último deploy **Ready conhecido como bom** e usar Instant Rollback/Promote conforme o plano; conferir o domínio e o commit. Não existe anterior conhecido nesta primeira publicação. Se ela falhar, manter o acesso fechado/indisponível até corrigir, sem afirmar rollback realizado.
2. Reverter no Git o commit de aplicação que causou o problema com `git revert SHA_DO_COMMIT` e PR; não usar force push. Variáveis precisam de conferência própria: rollback do código não desfaz alterações de segredos/configuração automaticamente.
3. **Não reverter o banco por reset ou migração destrutiva.** Manter schema compatível e criar migração corretiva para frente; restauração de backup é decisão de incidente separada. Nenhuma migração existente foi apagada/alterada nesta etapa.

## Fontes oficiais consultadas nesta preparação

Consulta em **30/10/2026**, somente para CI/publicação e configurações necessárias: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [Vercel limites](https://vercel.com/docs/functions/limitations), [duração](https://vercel.com/docs/functions/configuring-functions/duration), [Hobby e uso comercial](https://vercel.com/docs/plans/hobby), [rollback](https://vercel.com/docs/instant-rollback), [Supabase ambientes e migrações](https://supabase.com/docs/guides/deployment/managing-environments), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) e [segurança de chaves Google](https://developers.google.com/maps/api-security-best-practices). CLI instalado também teve `db push --help` conferido; a consulta à página específica do comando não respondeu nesta sessão.
