# Validação da busca — 28/10/2026

## Ambiente e escopo

Windows, Node 22.13.0, npm 10.9.2, Next 16.4.3, TypeScript strict, Vitest 5.0.5 e Chromium via Playwright 1.64.1. Dependências/lockfile preservados. Build de produção, sessões sintéticas pelo harness HTTP e SQL/RLS real das seis migrações em PGlite 0.5.12/PostgreSQL 18.6. Isso **não** comprova GoTrue, PostgREST/JWKS, SMTP ou PostgreSQL 17 da stack Supabase completa.

O servidor 3103 recebe explicitamente um arquivo privado gerado por `tests/support/prepare-search-catalog.mjs`. São 75 empresas sintéticas + duplicata, uma localidade/centro sintéticos e autorizações sintéticas. A tela diz **Catálogo SINTÉTICO de teste**, e cada registro tem `[TESTE]`. Esse manifesto não é ativado pela aplicação comum nem comprova licença real. Os testes unitários também exercitam a origem `licensed` com evidência sintética, sem inventar fornecedor conectado.

## Comandos executados

- `npm.cmd run check`: aprovado — lint sem avisos, tipos gerados conferidos, TypeScript, **138 testes unitários em 10 arquivos**, **74 verificações SQL/RLS** e build de produção.
- `npm.cmd run test:e2e`: aprovado — **47 cenários Chromium**, incluindo os 37 anteriores e os 10 novos de busca/segurança/interações. Verificações de Auth/demonstração preservadas.
- `npm.cmd run test:e2e -- tests/e2e/search.spec.ts -g 390x844`: aprovado — captura de viewport e inspeção adicional de foco no celular. A captura de página longa não substituiu a inspeção da área realmente visível.
- `git check-ignore .local-data/search-test.catalog.local.json`: confirmou isolamento do catálogo local no Git.

Não houve reinstalação de dependências nesta etapa; não se declara um novo `npm ci` executado. Não houve alteração de SQL/schema nem edição manual dos tipos gerados; a conferência por introspecção/hash passou. Nenhuma API comercial foi ativada, consultada, exportada, enviada à IA ou contratada.

## Cobertura

Regras: busca livre sem categoria; nichos em português; palavras-chave com acentos; vazio; deduplicação por referência nativa; três páginas e limite de 60; cursor recusado com filtros/revisão diferentes; precisão geográfica e ausência de coordenadas; cálculo de distância e travessia do meridiano 180°; limite de 20; rejeição de campos arbitrários; origem Google/cópia bloqueadas sem fetch; fonte ausente diferente de zero; autorização antes de leitura e após consulta; workspace alheio; flags; licença revogada; leitura real do arquivo temporário em teste; origem licenciada preservada; erro sem conteúdo interno; concorrência e ações/minuto por processo.

Transporte: no máximo três tentativas transitórias com 500/1.000 ms de espera; `Retry-After` longo respeitado; cancelamento interrompe espera; erros permanentes não repetidos; projeção inesperada não retorna corpo bruto. O estado de timeout é implementado; não foi feita injeção HTTP real de falha em um fornecedor externo ou medição de sua latência.

Navegador: os três modos em todas as dimensões; localização e raio; busca sem consulta a cada tecla; carregamento/cancelamento; erro 429 simulado e tentativa manual; página parcial/limite; filtro de sites sobre resultados já carregados; contagens distintas; detalhes sob demanda; drawer/Escape/foco de retorno; alternância mapa/lista; radio por teclado; toque principal de pelo menos 44 px; ausência de transbordamento global; ausência de chamadas Google/OpenAI no browser. Endpoint recusa sessão ausente, outro workspace, origem externa, campos inválidos e corpo excessivo; resposta válida contém no-store. A autorização SQL do harness usa a sessão de teste, nunca chave privilegiada no CRUD comum.

## Matriz e capturas

| Largura × altura CSS | Resultado | Apresentação |
| --- | --- | --- |
| 360 × 800 | Aprovado | Filtros expansíveis, lista em cards, detalhes em drawer |
| 390 × 844 | Aprovado | Cards, drawer, foco e captura adicional de viewport |
| 768 × 1024 | Aprovado | Tabela com rolagem interna, drawer |
| 1024 × 768 | Aprovado | Menu lateral, filtros/mapa-lista, drawer |
| 1366 × 768 | Aprovado | Menu 238 px, detalhe 335 px, rolagem localizada da tabela |
| 1536 × 1024 | Aprovado | Distribuição desktop e painel direito |
| 800 × 360 | Aprovado | Orientação horizontal emulada, rolagem e drawer |
| 844 × 390 | Aprovado | Orientação horizontal emulada, rolagem e drawer |

Capturas reproduzíveis em `test-results/search-busca-e-detalhes-em-<largura>x<altura>/`: `busca-livre.png`, `busca-livre-viewport.png`, `detalhes.png`, `detalhes-viewport.png` e `raio.png`. Página longa pode reposicionar visualmente elementos fixos; a verificação adicional confirmou que o atalho “Pular para o conteúdo” não recebeu foco indevido. Detalhes 390 × 844 e desktop 1366/1536 foram inspecionados visualmente em captura de viewport, além das capturas completas. Sem cortes globais, controles sobrepostos ou conteúdo escapando da página. Em tabela estreita, focar a ação pode deslocar horizontalmente o componente; isso não é rolagem da página inteira.

Na primeira execução, a lista móvel permanecia escondida na apresentação Mapa apesar do retorno correto. Corrigido: buscar explicitamente abre Lista abaixo de 768 px. Os seletores dos testes foram refinados para distinguir o campo de palavra-chave do painel de abas e o alerta da busca do anunciador de rotas Next. A checagem de tipos detectou uma resposta HTTP embrulhada duas vezes durante o ajuste de deadline; corrigido antes do build final. Não são tratadas como verificações aprovadas as execuções anteriores que falharam ou foram interrompidas para gerar o build atualizado.

## Pendências reais

- Nenhuma fonte real com evidência vigente foi configurada: falta `OWNED_CATALOG_FILE` aprovado e `FEATURE_CATALOG_SEARCH`/`FEATURE_CATALOG_DETAILS` habilitadas no ambiente real. Não foi executada consulta comercial controlada; resultados são exclusivamente de teste.
- Supabase real: URL/chave publicável/URL da aplicação, migrations e owner/membros precisam ser provisionados e validados. Permanecem limites do harness, conexões concorrentes e SMTP reais das etapas anteriores.
- Google Places/Maps/Geocoding não estão liberados por permissão para o fluxo atual. Não foram usados nem simulados como integração aprovada. `place_id`, geocodificação e chamadas Nearby/Text/Details reais não foram verificados. O código funciona com referências da fonte própria/licenciada; não alega integração Places real.
- Um futuro fornecedor via rede exigirá seus próprios campos, endpoint, cotas, direitos e testes controlados. Limites locais em memória não substituem consumo distribuído antes de APIs pagas. Gestão de evidências em PostgreSQL e fonte privada no deploy ainda não foram implementadas/provisionadas.
- Não há mapa real, CRUD comercial, auditoria, IA ou exportação implementados nesta etapa. Demonstração continua separada e identificada.
- Não foram testados teclado virtual, áreas seguras e mudança de orientação em aparelho físico. Emulação Chromium não comprova esses comportamentos, Safari/iOS ou Android real.
