# Validação da autenticação — 27/10/2026

Ambiente: Windows, Node 22.13.0, npm 10.9.2, Next 16.4.3 em build de produção, Playwright 1.64.1/Chromium com emulação de toque. Sem `.env.local`, credenciais externas ou chamadas ao Supabase hospedado.

## Checks executados

- `npm.cmd ci --offline --cache .npm-cache --no-fund`: instalação reproduzível aprovada, com 722 pacotes instalados. A primeira tentativa encontrou SWC em uso; o servidor dev deste workspace foi interrompido para liberar o arquivo e a instalação foi repetida com sucesso. O npm reportou zero vulnerabilidades conhecidas no audit daquele momento; não é garantia permanente. O aviso de manutenção do ESLint já está registrado em `VERSOES.md`.
- `npm.cmd run check`: lint sem warnings, tipos do schema conferidos, TypeScript strict, **62 testes unitários**, **72 cenários SQL/RLS** e build de produção aprovados.
- `npm.cmd run test:e2e`: **37 testes aprovados**, 16 de Auth e 21 de regressão da base/prospecção. A execução final usou quatro workers; isso não equivale a testar concorrência de múltiplas conexões PostgreSQL.
- `npm.cmd run db:types`: tipos regenerados após a migração 005: 22 tabelas, 11 funções e 8 enums, com hash das cinco migrações. Não é saída alegada do CLI oficial.
- Servidor dev reiniciado em `127.0.0.1:3000` após os testes: `/login` retornou 200 com configuração ausente explícita, `/perfil` retornou 307 ao login e a demonstração pública retornou 200. A configuração real do usuário não foi preenchida.

Os testes de navegador iniciam e encerram servidores locais em **3100** (configurado para fixture, cadastro fechado), **3101** (sem Supabase), **3102** (cadastro aberto explicitamente para o teste) e **54331** (fixture do provedor). Essas portas precisam estar livres. A fixture existe em `tests/support/auth-provider.mjs`, nunca é importada pelo runtime da aplicação e não existe um modo de bypass Auth no produto.

A fixture emula somente os contratos HTTP necessários ao SDK, sessões/tokens sintéticos e caixa de e-mail em memória. Assina seus próprios JWTs descartáveis e verifica assinatura/sessão no processo de teste. As consultas REST/RPC são traduzidas para SQL limitado às operações testadas, executado sob role `authenticated` e `auth.uid()` no **PostgreSQL 18.6/PGlite 0.5.12**, com as migrações/RLS reais. Não é implementação de GoTrue/PostgREST nem substitui a stack Supabase. Endpoints `/__test/*` existem somente no servidor loopback de teste, sem entrada nas rotas Next ou no build de aplicação.

## Fluxos verificados

- Acesso sem sessão recusado nas seis páginas privadas e na redefinição; login indisponível sem configuração e demonstração pública só por entrada explícita.
- Login correto/incorreto, e-mail não confirmado, cadastro fechado por padrão e cadastro habilitado explicitamente com confirmação, sem autoassociação a workspace.
- Recuperação com resposta genérica inclusive para endereço inexistente; GET/reload de confirmação não consome o token; confirmação por POST; redefinição com senhas divergentes/corretas; login com nova senha; tokens usados/expirados recusados.
- Callback PKCE positivo com challenge/verifier do SDK, preservação dos cookies após redirect/reload e recusa de callback inválido/redirecionamento externo.
- Renovação de sessão quando o cookie indica expiração; novo token devolvido ao navegador; sessão revogada recusada pelo servidor; respostas com `no-store`.
- Perfil próprio atualizado, seleção de workspace e retorno à prospecção sem resultados inventados; cookie de outro workspace e formulário adulterado para outro UUID recusados.
- Convite criado com mensagem explícita de ausência de envio, confirmação/definição de senha do destinatário, aceite único e ações administrativas ausentes para membro. SMTP/envio administrativo real não foram executados.
- Tentativa de remover o owner por adulteração de um formulário legítimo recusada pela Server Action/RPC. A suíte SQL também exercita transferência atômica, unicidade de owner, promoção indevida, remoção de associação e perda de acesso.
- Controles desabilitados durante requisição pendente; retorno ao estado utilizável; logout e nova tentativa de acesso privado recusada.
- Regressão de filtros, abas, drawers/foco, mensagens/clipboard, navegação, lista/mapa de exemplo e ausência de requisições a serviços externos na demonstração.

## Matriz de UI

| Largura × altura | Auth (login, recuperação, perfil, redefinição, membros, seleção) | Base/prospecção |
| --- | --- | --- |
| 360 × 800 | Aprovado | Aprovado |
| 390 × 844 | Aprovado | Aprovado |
| 768 × 1024 | Aprovado | Aprovado |
| 1024 × 768 | Aprovado | Aprovado |
| 1366 × 768 | Aprovado | Aprovado |
| 1536 × 1024 | Aprovado | Prospecção aprovada; base também em 1536 × 960 |
| 844 × 390, horizontal | Aprovado | Aprovado |
| 800 × 360, horizontal | Não acrescentado à matriz Auth; já há 844 × 390 | Base/prospecção aprovadas |

Verificou-se transbordamento global, rótulos, toque principal de pelo menos 44 px, formulários e navegação. Auth é um fluxo vertical sem painel fixo que bloqueie a ação em alturas curtas. Capturas em `test-results/auth-autenticação-e-perfil-em-<dimensão>/`: `login.png`, `recuperacao.png`, `perfil.png`, `redefinicao.png`, `membros.png`. Cadastro habilitado e redefinição após recuperação também possuem capturas próprias. Relatório local: `playwright-report/index.html`. Artefatos são ignorados pelo Git e contêm somente dados sintéticos.

Foram inspecionadas visualmente capturas de login em 1536 × 1024, 1366 × 768, 390 × 844 e 844 × 390, e de membros/redefinição em 390 × 844: sem cortes, sobreposição ou rolagem horizontal observados. Os testes automatizados não são uma auditoria WCAG completa.

## Limitações e verificações ainda pendentes

- Supabase real/GoTrue, Data API real, JWT/JWKS do projeto, autenticação administrativa e e-mails/SMTP: sem credenciais de projeto e sem runtime Docker/Podman. A fixture não comprova esses serviços nem entrega de e-mail.
- Versão PostgreSQL do destino (config local major 17) e concorrência de transações/conexões: PGlite executou 18.6 com conexão exclusiva. Repetir a suíte no ambiente alvo.
- Cookies Secure em domínio HTTPS real, cache/CDN Vercel, rotação simultânea entre abas/dispositivos e expiração real no serviço Auth: pendentes de ambiente configurado. O teste de renovação altera a data do cookie sintético; a sessão revogada é removida na fixture.
- Dispositivo físico, teclado virtual, notch/safe areas e navegadores mobile reais: não disponíveis. Emulação de viewport/toque e CSS de áreas seguras não comprovam esses comportamentos físicos.
- Captchas/MFA/SSO e disparos comerciais não fazem parte desta etapa. Nenhum novo serviço pago foi contratado ou acionado.

Passos de configuração e roteiro no ambiente real: [AUTENTICACAO.md](AUTENTICACAO.md). Execute login/logout/recuperação/convite com duas contas de workspaces distintos; confirme recusa de IDs alheios também pela Data API com JWT de usuário, sem chave privilegiada. Não use contas/seeds sintéticas como acesso de produção.
