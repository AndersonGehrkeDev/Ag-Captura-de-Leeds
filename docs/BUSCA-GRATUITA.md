# Busca nacional gratuita

Decisão e consulta de fontes oficiais: **31/10/2026 (BRT)**. Escopo autorizado: uso próprio, municípios de todo o Brasil, sem cartão, pagamento ou créditos de API. Nenhum plano foi contratado ou alterado.

## Escolha

| Parte | Serviço | Condições aplicadas |
|---|---|---|
| Municípios | [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades), [registro de referência e reuso](https://www.gov.br/conecta/catalogo/apis/registro-referencia-municipios) | Identificadores oficiais, nome e UF para seleção. Cópia normalizada de 5.571 municípios da resposta de 31/10. Atribuição IBGE; sem geocoding por tecla, IA ou exportação desses metadados. |
| Empresas | [Overpass Private.coffee e termos do operador](https://overpass.private.coffee/) | Permite aplicativos, inclusive comerciais, sem registro ou chave. Exige uso responsável, limitação de simultaneidade, User-Agent identificável e preferência por POST. Serviço comunitário sem garantia de disponibilidade/atualização. |
| Licença das empresas | [OpenStreetMap copyright](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) | Exibição com atribuição e licença; cache normalizado separado dos metadados comerciais. Uso interno pessoal. Exportação de conteúdo OSM e envio à IA permanecem bloqueados; redistribuição futura exige atender também compartilhamento da base derivada sob ODbL. |
| Mapa | [OpenFreeMap](https://openfreemap.org/), [integração](https://openfreemap.org/quick_start/), [termos](https://openfreemap.org/tos/) | Mapa incorporado sem conta, chave ou créditos. Estilo dark, créditos OpenFreeMap/OpenMapTiles/OSM preservados. Sem extração de POIs dos tiles, download offline ou captura de base cartográfica. Disponibilidade sem SLA. |
| Renderização | [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) | SDK BSD-3-Clause fixado em 6.16.0; carregado só na visualização solicitada após a busca. Marcadores, agrupamento, teclado/toque e alternativa em lista. |

Alternativas examinadas: Google permanece incompatível com a decisão atual de uso do produto; Geoapify tem créditos e não atende ao pedido; [Overture Places](https://docs.overturemaps.org/guides/places/) oferece dados abertos baixáveis, mas não uma API nacional de busca pronta e gratuita para esta hospedagem. Um recorte fixo não atendia à exigência de qualquer cidade. [Overpass principal](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) desaconselha depender de seus servidores como backend de aplicativos: não foi conectado. A permissão específica da Private.coffee foi verificada separadamente.

## Funcionamento e limites reais

1. A lista oficial é filtrada **localmente** pelo nome/UF. Escolha a cidade e clique em Buscar empresas; digitar ou mover o mapa não consulta empresas.
2. O servidor resolve o UUID da localização para um código IBGE da lista confiável; não aceita Overpass QL, bounding boxes, endpoints ou licenças do cliente.
3. A consulta utiliza a área administrativa **cadastrada no OSM** com `ref:IBGE` e `admin_level=8`. Isso não comprova divisa oficial. Se a área não existir, a aplicação informa indisponibilidade geográfica em vez de afirmar ausência de empresas.
4. Busca livre inclui estabelecimentos com nome e tags de comércio, serviços/escritórios e amenidades comerciais. Nichos mapeiam vocabulário fechado; palavras conhecidas mapeiam nichos, outras filtram o nome no OSM. Não é busca semântica. Termos com e-mail, telefone ou URL são recusados.
5. Um POST, timeout Overpass 25 s/64 MiB, resposta máxima 2 MiB. Até 61 itens são solicitados para identificar truncamento; até 60 são entregues. As páginas de 20 são **locais**, não paginação nativa do Overpass. Total populacional permanece desconhecido. Não há varredura por grades, lote nacional ou consultas automáticas por deslocamento do mapa.
6. Cache de consulta por 24 h, isolado por workspace. Gate SQL atômico de **100 novas consultas/dia UTC por instalação**, uma simultânea e intervalo de 10 s. Não são créditos compráveis: é proteção operacional do aplicativo. Falhas também consomem a tentativa; não há retries automáticos nem rotação de instâncias. Interrupções não geram resultados sintéticos.
7. Até 1.000 registros normalizados por workspace; registros vinculados ao CRM têm prioridade sobre descarte dos mais antigos. Conteúdo consultável por até 365 dias, com data visível. Limpeza de vencidos ocorre nas operações autenticadas; não foi configurado agendamento independente de expurgo para workspaces inativos. Limites/prazos são decisões operacionais, não uma alegação de TTL obrigatório da ODbL.
8. O cache armazena só referência OSM, nome, categoria traduzida de tags, site HTTP(S), endereço, associação municipal derivada da área e coordenadas/data. Sem respostas integrais, contatos, fotos, notas ou avaliações inventadas. Site ausente não comprova empresa sem site.
9. O CRM mantém sua arquitetura: só referência aprovada e metadados próprios; nomes/sites são resolvidos na fonte. A migração 011 não modifica o CRUD/RLS existentes. Sem `service_role` ou chave Supabase privilegiada. IA, auditorias, exportação de campos OSM e link para outro provedor continuam sujeitos a permissões próprias e desativados nesta fonte.
10. Abrangência por raio está indisponível nesta fonte. Nenhum centro municipal foi inventado. Mapas mostram os mesmos resultados carregados/filtrados e detalhes sob demanda, com fallback em lista se WebGL/tiles falharem.

## Configuração

Aplicar somente a migração pendente `20261031001100_open_business_search.sql`. No workspace AG já provisionado ela registra a política SQL de referência OSM a partir do owner existente; não cria usuário nem transfere propriedade.

Variáveis somente do servidor: `OPEN_DATA_CATALOG_ENABLED=true`, `OPEN_DATA_WORKSPACE_ID`, `OPEN_DATA_REVIEWER_ID`; habilitar `FEATURE_CATALOG_SEARCH` e `FEATURE_CATALOG_DETAILS`. Reutilizar `CRM_EXECUTOR_SECRET` e seu hash já configurados, mais `FEATURE_OWN_DATA_PERSISTENCE` para adicionar lead. Não definir chaves Google. `FEATURE_DATA_EXPORT`/`FEATURE_AI_MESSAGES` não concedem direitos sobre OSM. Se `OWNED_CATALOG_FILE` estiver informado, ele tem prioridade.

O arquivo `data/open/municipios.json` deve estar no tracing serverless, como configurado em `next.config.ts`. Atualização administrativa (Node 22, sem credenciais): `node scripts/open-data/update-municipalities.mjs`; revisar o diff e publicar normalmente. Não executa buscas de empresas.

Novos workspaces exigem aprovação/configuração administrativa própria; um membro não pode declarar origem, aprovar licença ou trocar o workspace no cache. Não reaplicar bootstrap nem usar a base do outro sistema.

## Verificação desta alteração

Testes direcionados: construção dos três modos/entrada hostil, allowlist/ausências/proveniência, 429 sem retry, seleção nacional/cache e SQL real no PGlite com dois escopos, reserva exclusiva e teto persistente. Acesso real da API, mapa e CRM na Vercel ficam registrados no acompanhamento após a conferência, distinguindo-os dos testes com fixtures. Não foi executada a suíte geral.
