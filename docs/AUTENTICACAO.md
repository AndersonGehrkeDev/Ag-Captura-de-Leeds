# Autenticação e acesso a workspaces

Implementado em 27/10/2026 com `@supabase/ssr` 0.12.7 e `@supabase/supabase-js` 2.118.0, Next.js 16.4.3. O código inicia sem chaves: `/login` informa a configuração pendente e mantém o formulário indisponível. `/prospeccao/demonstracao` continua público, com fixtures visíveis e nenhuma sessão/gravação real.

## Configuração do ambiente

Configure diretamente em `.env.local` ou nas variáveis do ambiente Vercel, nunca no chat:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Origem canônica exata, sem caminho/query/fragmento; HTTPS em produção, HTTP somente em loopback local |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase; HTTP somente em loopback para stack local |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável `sb_publishable_*`, ou anon JWT legada; chaves secretas/service_role são recusadas neste campo |
| `AUTH_ALLOW_SIGNUP` | Apenas o valor literal `true` habilita cadastro público no aplicativo. Ausente/false mantém acesso por convite |
| `SUPABASE_SECRET_KEY` | Opcional, exclusivamente no servidor para `auth.admin.inviteUserByEmail`; nenhuma consulta ou mutação comum usa essa chave |

Após configurar ou alterar a origem, reinicie/reimplante o servidor. O cliente de navegador recebe somente URL/chave publicáveis validadas pelo servidor; não recebe o ambiente inteiro. As demais integrações continuam opcionais e não são chamadas pelo Auth.

## Painel Supabase

1. Aplique **todas as migrações versionadas** na ordem indicada em [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md) (atualmente seis). O schema `private` não deve ser exposto na Data API.
2. Em **Authentication → URL Configuration**, defina **Site URL** igual a `NEXT_PUBLIC_APP_URL`, sem barra final. Use um projeto/ambiente apropriado para cada origem. Não derive a origem de `Host`, `X-Forwarded-Host` ou parâmetros enviados pelo usuário.
3. Em configuração de usuários/Auth, mantenha **Allow new users to sign up desativado** para uso interno por convite. O bloqueio do aplicativo sozinho não bloqueia chamadas diretas ao Auth. Para abrir o cadastro deliberadamente, habilite esse controle no Supabase **e** `AUTH_ALLOW_SIGNUP=true` no aplicativo. O cadastro nunca cria/associa automaticamente workspace ou owner.
4. Habilite o provedor **Email**, **Confirm email**, senha mínima de **12 caracteres**, com maiúscula, minúscula e número. Usuários existentes com senha antiga ainda podem entrar; a política da aplicação é aplicada à criação/redefinição de senhas.
5. Configure o envio de e-mail no Supabase e seus limites. A aceitação de uma requisição não comprova entrega. Nenhum serviço de e-mail pago foi adicionado. Em stack local, use o Mailpit disponibilizado pelo CLI; aqui essa stack não pôde iniciar por ausência de Docker/Podman.
6. Provisione um usuário Auth real confirmado como owner da AG, usando o procedimento administrativo de `supabase/bootstrap.sql.example`. A primeira pessoa a entrar não recebe esse papel automaticamente.

O `supabase/config.toml` local já mantém signup fechado, confirmação habilitada, rotação de refresh token, política de senha e templates versionados. Essas configurações **não alteram um projeto hospedado** automaticamente.

## URLs e templates de e-mail

Cadastre os destinos exatos abaixo na allowlist do Supabase, substituindo a origem pelo domínio autorizado:

```text
https://seu-dominio.example/auth/callback?next=/workspaces
https://seu-dominio.example/auth/callback?next=/redefinir-senha
```

Para desenvolver em `localhost:3000`, use os mesmos dois caminhos com `http://localhost:3000`. Se usar `127.0.0.1`, altere tanto o ambiente quanto Site URL/allowlist para essa origem; os cookies e a verificação de Origin exigem consistência. O config local usa `127.0.0.1:3000`. Em produção, não libere wildcards de outros projetos/domínios.

Copie o HTML versionado para **Authentication → Email Templates** do projeto hospedado:

| Template do Supabase | Arquivo | Destino do link |
| --- | --- | --- |
| Confirm signup | `supabase/templates/confirmation.html` | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` |
| Reset password | `supabase/templates/recovery.html` | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` |
| Invite user | `supabase/templates/invite.html` | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` |

O HTML usa `&amp;` no atributo. Não use um link com fragmento `#access_token` para estas rotas. `/auth/confirm` recebe o token hash e só chama `verifyOtp` após o botão **Confirmar e continuar**, reduzindo consumo por scanners que fazem GET. O token continua sendo um segredo de uso único: não compartilhe URLs/capturas com o token, não ative rastreamento de links de e-mail e remova query strings de logs/APM/proxies desses caminhos. O Next está configurado sem logging de requisições recebidas e as respostas Auth usam `Referrer-Policy: no-referrer`.

`/auth/callback` suporta troca de código **PKCE** via `exchangeCodeForSession`. O código exige o cookie verifier do navegador que iniciou o fluxo; outro navegador/dispositivo pode não ter esse cookie. Os templates por token hash são o fluxo recomendado, inclusive para convites administrativos. Falhas não encaminham código/token/erro bruto para a próxima URL. Apenas destinos internos enumerados são aceitos.

## Fluxos e autorização

- **Login:** `signInWithPassword` no servidor, seguido de `getUser`. Senha nunca volta no estado do formulário. E-mail não confirmado recebe orientação para usar o link de confirmação.
- **Recuperação:** resposta genérica para e-mail elegível/inexistente, sem confirmar cadastro. Falha temporária/limite recebe mensagem própria. O link confirmado abre `/redefinir-senha`; `getUser` também protege essa página e a operação de senha. Uma sessão própria já válida pode redefinir sua própria senha. Depois da atualização, solicita logout global; se o provedor não confirmar esse encerramento, a interface informa a falha sem afirmar que ocorreu.
- **Logout:** encerra a sessão atual via SDK, limpa seleção de workspace e retorna ao login. Tokens de acesso já emitidos podem permanecer válidos até expirar no serviço; não descrevemos logout como invalidação criptográfica imediata de todo JWT. Rotas/operações da aplicação consultam `getUser` novamente e o banco aplica RLS.
- **Perfil:** leitura/atualização do próprio ID verificado. Somente nome de exibição é editado; papel e e-mail de autorização não vêm de metadata editável.
- **Workspaces:** lista limitada às associações atuais. O cookie `ag-workspace` é HTTPOnly/SameSite Lax, contém somente UUID e não concede autorização. Um único workspace disponível pode ser escolhido implicitamente; com múltiplos, é preciso selecionar. Cookie alheio/associação removida redireciona para seleção com aviso.
- **Páginas privadas:** `/base`, `/configuracoes`, `/prospeccao`, `/perfil`, `/workspaces` e `/workspace/membros`. O Proxy renova a sessão e transporta cookies na requisição/resposta e em redirects. Layouts, páginas de tenant e **cada Server Action** repetem a verificação pertinente; o Proxy não é o único controle de segurança. Operações de escrita validam entrada, origem canônica, identidade e associação; RLS/constraints continuam ativas.
- **Cache/cookies:** layouts privados/Auth são dinâmicos; fetches do cliente servidor usam `no-store`; respostas usam cache privado/no-store, cabeçalhos CDN/Vercel no-store e `Vary: Cookie`. Cookies Supabase usam SameSite Lax e Secure em HTTPS, permanecendo acessíveis ao SDK de navegador conforme o fluxo SSR; não se confunde isso com o cookie HTTPOnly de seleção de workspace. Não há clientes de servidor globais, ISR nem cache compartilhado de identidade.
- **Browser:** cliente SSR de navegador acompanha eventos para atualizar a interface em logout/refresh; não autoriza usando o objeto de sessão. O app não usa `getSession` para verificar identidade. SDK/cookies de autenticação são gerenciados pelo Supabase, inclusive chunking.
- **Formulários:** ações assíncronas exibem estado pendente, desabilitam controles para impedir cliques repetidos, mantêm mensagens anunciadas e permitem navegação por teclado. As telas preservam o tema AG, com campos de 48 px, alvos principais de pelo menos 44 px e rolagem vertical acessível.

## Convites e proteção de propriedade

Em `/workspace/membros`, owner pode convidar `member/admin`; admin convida somente `member`. As RPCs verificam isso novamente, com a sessão comum do usuário. Convites de workspace expiram em **72 horas**, são revogáveis e só podem ser aceitos uma vez, pela identidade cujo **e-mail confirmado em auth.users** corresponde ao destinatário.

Com `SUPABASE_SECRET_KEY` configurada, somente após criar um convite autorizado o adaptador administrativo solicita ao Auth o envio de convite para criar/acessar a conta. Esse cliente isolado não executa CRUD comum e não é exportado para a UI. Sem a chave, o convite de workspace é criado e a interface informa que **não enviou e-mail de acesso**: contas existentes encontram o convite em `/workspaces`; novas contas precisam ser convidadas no painel Auth pelo operador. A aplicação não simula entrega ou cria uma conta alternativa.

Convite Auth e convite de workspace são objetos diferentes. O link Auth tem a expiração configurada no provedor (`otp_expiry=3600` no config local), independente dos 72 h do workspace. Revogar o convite do workspace impede o aceite mesmo com uma sessão Auth válida; não exclui a conta Auth, que pode ter outras associações legítimas.

A migração `005` adiciona `ag_list_my_invitations()` e `ag_accept_invitation_by_id(uuid)`: provam o e-mail confirmado no banco, sem colocar o token de workspace em metadata/URL. O RPC legado por token permanece protegido; a UI descarta esse token na criação. O aceite consome o hash, registra uso/auditoria e nunca promove uma associação existente.

Papel owner não é oferecido em convites. Remoção/rebaixamento direto do owner falha no banco. A transferência exige outro membro existente, confirmação textual **TRANSFERIR**, papel atual de owner e RPC transacional: o owner anterior se torna admin e permanece exatamente um owner. Um usuário comum pode sair do workspace; o owner precisa transferir antes.

## Verificação e pendências

Comandos, evidências, matriz de telas e limites estão em [VALIDACAO-AUTH.md](VALIDACAO-AUTH.md). Os testes locais usam a aplicação/SDK reais com uma fixture HTTP e SQL/RLS executados em PostgreSQL PGlite; **não são testes do serviço Supabase Auth/SMTP real**.

Ainda falta aplicar migrações/configuração/templates no projeto Supabase autorizado, provisionar owner real e validar com duas contas reais, e-mails recebidos, PKCE/OTP, cookies no domínio HTTPS/CDN, expiração/rotação e concorrência na stack completa. Não há projeto remoto conectado ou deploy realizado nesta entrega.

Fontes oficiais consultadas em 27/10/2026: [SSR e cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [verificação e cache](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [senha e recuperação](https://supabase.com/docs/guides/auth/passwords), [convite administrativo](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [templates locais](https://supabase.com/docs/guides/local-development/customizing-email-templates), [redirects](https://supabase.com/docs/guides/auth/redirect-urls), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp) e [Proxy Next.js 16](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). A API de cookies/Proxy também foi conferida na documentação empacotada do Next instalado.
