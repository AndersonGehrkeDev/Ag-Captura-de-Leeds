# Verificação da base técnica — 27/10/2026

Escopo: somente a etapa 1 e as rotas `/` e `/configuracoes`. Ambiente Windows, Node.js 22.13.0, npm 10.9.2. Nenhum arquivo `.env.local` foi criado. Integrações externas ausentes durante os testes de navegador; nenhuma credencial real foi utilizada.

## Comandos executados e resultados

| Comando | Resultado |
| --- | --- |
| `npm.cmd install --offline=false --cache .npm-cache --no-fund` | Instalação inicial e geração de lockfile |
| `npm.cmd ci --offline=false --cache .npm-cache --no-fund` | Instalação limpa reproduzível aprovada; audit da instalação reportou zero vulnerabilidades conhecidas naquele momento |
| `npm.cmd run check` | Lint sem warnings, tipos, 18 testes unitários em 2 arquivos e build de produção aprovados |
| `node node_modules/@playwright/test/cli.js install chromium` | Chromium necessário aos testes instalado |
| `npm.cmd run test:e2e` | 9 testes de navegador aprovados |
| `npm.cmd run dev -- --hostname 127.0.0.1 --port 3101` | Servidor iniciou sem chaves; `/` e `/configuracoes` retornaram HTTP 200; servidor encerrado após verificação |
| `git check-ignore ...` | Credenciais locais, cache, dependências, Vercel e artefatos de teste ignorados; `.env.example` permanece versionável |
| `git remote -v` | Nenhum remoto configurado |

`--offline=false` foi necessário porque o ambiente de execução impunha cache offline por padrão; `.npm-cache` é local e ignorado. Usou-se `npm.cmd` para contornar o bloqueio do atalho PowerShell, sem alterar a política do sistema. Os testes/build usaram autorização de execução fora do sandbox, que bloqueava subprocessos do runner com EPERM. Isso não exigiu alterar o código para contornar proteções.

## Cobertura dos testes

Os testes unitários verificam inicialização sem integrações, independência dos recursos, obrigatoriedade de campos por recurso, valores em branco, placeholders, URLs inválidas, projeção sem valores sensíveis, acesso isolado à configuração de um provedor e erro seguro para configuração incompleta.

O Playwright executa em Chromium com suporte a toque emulado, contra o servidor de produção iniciado automaticamente na porta 3100. Verifica as duas páginas, ausência de overflow horizontal global e requisições externas, idioma, estados reais de configuração ausente e ausência de erros JavaScript. Nas larguras menores que 1024 px, verifica menu por toque, alvos de abertura/fechamento de 44 × 44 px, contenção do foco ao usar Tab, fechamento por Escape, retorno do foco e navegação até configurações. Um teste adicional verifica o atalho de teclado para o conteúdo principal.

## Capturas locais reproduzíveis

Para cada dimensão abaixo, o diretório `test-results/foundation-base-e-configurações-em-<largura>x<altura>/` contém `base.png` e `configuracoes.png`. As cinco dimensões com menu móvel também contêm `menu.png`. O relatório é `playwright-report/index.html`. Os arquivos são artefatos locais ignorados pelo Git e serão recriados por `npm run test:e2e`.

| Dimensão | Rotas verificadas | Navegação | Resultado |
| --- | --- | --- | --- |
| 360 × 800 | `/`, `/configuracoes` | Menu móvel | Aprovado |
| 390 × 844 | `/`, `/configuracoes` | Menu móvel | Aprovado |
| 768 × 1024 | `/`, `/configuracoes` | Menu móvel | Aprovado |
| 1024 × 768 | `/`, `/configuracoes` | Menu lateral | Aprovado |
| 1366 × 768 | `/`, `/configuracoes` | Menu lateral | Aprovado |
| 1536 × 960 | `/`, `/configuracoes` | Menu lateral | Aprovado |
| 800 × 360 | `/`, `/configuracoes` | Menu móvel, orientação horizontal | Aprovado |
| 844 × 390 | `/`, `/configuracoes` | Menu móvel, orientação horizontal | Aprovado |

Inspeção visual de capturas: base em 360 × 800 e 1536 × 960; configurações em 390 × 844 e 844 × 390; menu em 800 × 360. A captura do menu aguarda o fim da abertura, evitando registrar um estado intermediário de animação como resultado de layout.

## Limitações e pendências

- Não há teste físico de teclado virtual, recorte de câmera ou áreas seguras de dispositivo. CSS e viewport já contemplam áreas seguras e altura dinâmica, mas emulação de tamanho/toque não comprova comportamento físico.
- Não há formulários de autenticação, mapa, filtros comerciais, tabelas ou Kanban nesta etapa; serão testados quando implementados. Nenhuma API externa foi validada.
- Git foi inicializado localmente, sem remoto, commit, push ou deploy. GitHub e Vercel aguardam destino e conexão autorizada.
- O registro npm avisa que ESLint 9 terminou o suporte. A versão 9.39.5 foi usada por compatibilidade declarada dos plugins Next atuais; a atualização coordenada é uma pendência de manutenção, documentada em `VERSOES.md`.
