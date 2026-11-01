# Busca nacional gratuita

Decisões e fontes oficiais consultadas em **31/10/2026 (BRT)**. Escopo: uso próprio, municípios de todo o Brasil, sem pagamento, cartão ou créditos de API. Nenhuma assinatura foi contratada.

## Solução adotada

| Parte | Fonte oficial | Aplicação |
|---|---|---|
| Seleção municipal | [IBGE Localidades v1](https://servicodados.ibge.gov.br/api/docs/localidades), [registro de referência e reuso](https://www.gov.br/conecta/catalogo/apis/registro-referencia-municipios) | Lista normalizada de 5.571 municípios; nomes/códigos/UF e atribuição IBGE. Filtragem local, sem chamada por tecla. |
| Resolução geográfica | [IBGE Malhas v3](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) | GeoJSON simplificado por código municipal; caixa envolvente calculada no servidor. Não é teste exato de inclusão na divisa. |
| Empresas | [Overture Places](https://docs.overturemaps.org/guides/places/), [arquivos públicos](https://docs.overturemaps.org/getting-data/cloud-sources/), [licenças por origem](https://docs.overturemaps.org/attribution/#places) | Consulta anônima ao GeoParquet público, release **2026-10-21.0**, com DuckDB oficial no servidor. Sem conta AWS/Azure, chave ou serviço de consultas pago. |
| Licença das empresas | [CDLA Permissive 2.0](https://cdla.dev/permissive-2-0/) | Somente registros cujas fontes são Meta/Microsoft/Overture e todas declaram CDLA-Permissive-2.0. Texto integral em `/licencas/CDLA-Permissive-2.0.txt`, junto à atribuição. Outras fontes/licenças Overture são excluídas nesta versão. |
| Mapa | [OpenFreeMap](https://openfreemap.org/), [integração](https://openfreemap.org/quick_start/), [termos](https://openfreemap.org/tos/) | Mapa dark sem conta, chave ou créditos. Créditos OpenFreeMap/OpenMapTiles/OSM preservados. Sem extração de POIs dos tiles ou downloads offline. |
| Renderização e consulta | [MapLibre](https://maplibre.org/maplibre-gl-js/docs/), [DuckDB Node Neo](https://duckdb.org/docs/1.5/clients/node_neo/overview) | `maplibre-gl` 6.16.0 e `@duckdb/node-api` 1.5.6-r.2 fixados. Carregamento sob demanda; DuckDB com 256 MiB, duas threads, httpfs oficial assinado, SQL parametrizado, interrupção e fechamento explícito. |

Overture é uma base aberta consultada diretamente, não uma alegação de API nacional gratuita pronta. Não baixamos o Brasil inteiro para Supabase. A consulta lê colunas necessárias e filtra cidade declarada, caixa envolvente, confiança da fonte ≥ 0,8 e segmento/nome; isso não garante atualidade ou ausência de duplicatas entre IDs distintos. A confiança não é nota comercial nem avaliação de clientes.

## Condições e limites

- Selecione cidade e clique em **Buscar empresas**. Nada consulta empresas ao digitar, abrir a tela ou mover o mapa. Busca livre não exige nicho; nichos são fechados; palavras conhecidas mapeiam segmentos e outras procuram o nome, sem busca semântica.
- A localidade vem da lista confiável do servidor. O filtro combina cidade declarada na Overture com caixa envolvente da malha IBGE, sem prometer divisa exata, censo ou todas as empresas. Raios permanecem indisponíveis; nenhum centro municipal foi inventado.
- Até 61 registros são lidos para identificar truncamento e até **60** são entregues. Páginas de 20 são locais, não paginação de API. Total populacional desconhecido. Sem varredura por grades, lote nacional ou repetição automática.
- Cache de consultas por **24 h**, isolado por workspace. Gate SQL atômico global: **100 novas consultas/dia UTC**, uma simultânea, intervalo de 10 s; reserva expira em 55 s. São limites operacionais gratuitos, sem venda de créditos. Falhas contam como tentativa; cache não provoca nova leitura externa.
- Até 1.000 registros normalizados por workspace; dados vinculados ao CRM têm prioridade no descarte. Consulta a registros por até 365 dias, com data/release. Expirados são limpos nas operações autenticadas; não há agendamento independente de expurgo para workspaces inativos. Os prazos são operacionais, não um TTL atribuído à licença.
- O runtime aguarda consulta, interrupção/fechamento e liberação de reserva; não depende de trabalho após a resposta. Deadline de aplicação 45 s, handler Vercel 60 s, timeout HTTP DuckDB 5 s e sem retries. Busca fria pode levar dezenas de segundos. Falhas não geram dados sintéticos.
- Allowlist: referência, origem, nome, categoria traduzida, site HTTP(S), endereço, associação municipal, coordenadas e data. Sem respostas brutas, contatos, fotos ou avaliações. Site não informado não comprova empresa sem site. Campos ausentes não viram diagnóstico.
- Dados continuam `licensed`, com proveniência Overture/CDLA e ancestralidade IBGE para associação municipal. O mapa usa OSM independentemente: não misturamos bases nem promovemos conteúdo Google a dado livre. Google continua bloqueado.
- CRM conserva só referência aprovada e metadados comerciais; nomes/sites são resolvidos na fonte. Migrações 011/012 reutilizam sessão, associação e prova CRM, sem credencial privilegiada em CRUD. Exportação de conteúdo dessas fontes e IA permanecem bloqueadas; auditorias exigem permissões/configuração próprias.
- Mapa/lista/detalhes compartilham seleção e filtros, com drawer mobile e controles de toque/teclado. Falha de WebGL/tiles tem alternativa em lista. Serviços gratuitos e planos Free/Hobby têm limites e não garantem disponibilidade.

## Configuração e atualização

Aplicar somente migrações pendentes, sem reset/seeds. 011 cria cache/gate privado; 012 acrescenta namespace/política Overture, preservando histórico. Na AG dedicada, política é provisionada administrativamente a partir do owner existente; não há auto-claim.

Servidor: `OPEN_DATA_CATALOG_ENABLED=true`, **`OPEN_DATA_PROVIDER=overture`**, `OPEN_DATA_WORKSPACE_ID`, `OPEN_DATA_REVIEWER_ID`, `FEATURE_CATALOG_SEARCH=true` e `FEATURE_CATALOG_DETAILS=true`. Reutilizar Supabase/`CRM_EXECUTOR_SECRET`/hash e `FEATURE_OWN_DATA_PERSISTENCE` para adicionar lead. Sem chaves Google. Flags de exportação/IA não concedem licença. `OWNED_CATALOG_FILE` tem prioridade, sem misturar fontes.

`data/open/municipios.json` é público e incluído no tracing; empresas/cache/CRM ficam fora de Git/assets públicos. Atualização administrativa sem credenciais: `node scripts/open-data/update-municipalities.mjs`; revisar diff e publicar. Release Overture está fixada em `model.ts`: atualizar após revisar schema, disponibilidade e licenças; sem atualização silenciosa para fonte desconhecida.

O build externaliza DuckDB e inclui o binário da plataforma na função `/api/prospeccao`. httpfs assinado usa diretório temporário, sem escrita na aplicação. Sem banco DuckDB persistente, fila em memória ou conexão global com dados privados. Memória/tempo da Vercel Hobby podem limitar consultas; não atualizar plano automaticamente.

## Alternativas examinadas

[Private.coffee](https://overpass.private.coffee/) permite Overpass em aplicativos sem chave e permanece como opção explícita `OPEN_DATA_PROVIDER=osm`. Consultas expiraram localmente e na Vercel em 31/10: não é a fonte ativa. Sem fallback/rotação automática; origem OSM/ODbL, IDs e créditos são distintos da Overture. [Overpass principal](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) desaconselha dependência de seu servidor público por aplicativos e não foi conectado.

Google continua bloqueado; Geoapify usa créditos. [Ohsome v2](https://heigit.org/ohsome-2-0-has-arrived-2/) exige conta/chave e o v1 será desativado em 30/11/2026; não foi conectado. Não usamos scraping ou permissões presumidas de sites de terceiros.

## Verificação e rollback

Testes direcionados de transporte, consulta/proveniência/cache/SQL; CI essencial acrescenta seis casos sem rede externa. A consulta gratuita real Overture passou por opt-in local após corrigir a instalação oficial httpfs. Ela só roda com `AG_LIVE_OVERTURE_TEST=true`, ausente na CI. Conferência de publicação, mapa e CRM consta no acompanhamento após execução na hospedagem.

Rollback: desabilitar `OPEN_DATA_CATALOG_ENABLED` e redeployar ou promover o deployment anterior da Vercel; reverter commit no Git se necessário. Manter migrações aditivas e dados, sem reset/drop. Não há migração automática na CI.
