# Contratos, permissões e integrações

Consulta inicial em **27/10/2026**, complementada em **28/10/2026** para busca/auditorias e **30/10/2026** para OpenAI Responses e controles de dados. Política implementada: `2026-10-28.1`; contratos internos de catálogo: versão `2`. Este registro separa exigências das fontes, decisões conservadoras do produto e integração efetivamente implementada. Não comprova aceite contratual, titularidade de dados, configuração de uma conta ou funcionamento de uma API. Implementações condicionais: [catálogo](BUSCA-DE-EMPRESAS.md), [auditorias](AUDITORIAS.md), [mensagens](MENSAGENS-IA.md) e [CRM](CRM.md). Não foi fornecida fonte real aprovada nem feita análise PSI ou chamada OpenAI real. A etapa CRM reutiliza esta política, sem nova pesquisa ou liberação de fonte.

## Decisão para a AG Prospecção

**Google Places/Maps não estão liberados para o fluxo proposto de descoberta comercial, avaliação de oportunidades, formação de CRM, campanhas, exportação e mensagens de prospecção.** O produto seguirá com contratos substituíveis por fontes próprias ou licenciadas. Chaves, cobrança ativa, atribuição ou uma flag não substituem permissão para o caso de uso.

Os [termos Maps não EEA, §3.2.3](https://cloud.google.com/maps-platform/terms) restringem diretórios/produtos de publicidade, extração, cache não autorizado e conteúdo derivado. Incluem restrições a treinamento/teste/validação de modelos. A combinação de busca de empresas, seleção de oportunidades e formação de base comercial exige revisão desse enquadramento; não foi apresentada autorização específica. **Decisão de produto:** bloquear consulta, exibição e processamento Google neste fluxo, inclusive IDs. Não afirmamos que toda inferência de IA seja indistintamente proibida pela cláusula de treinamento; a permissão para este processamento não foi estabelecida.

O endereço de faturamento e o contrato da conta não foram informados. Os [termos EEA](https://cloud.google.com/terms/maps-platform/eea) têm redação diferente: não se deve transplantar automaticamente a cláusula de diretórios não EEA. Permanecem restrições sobre extração/cache/derivação e obrigações próprias. Não há habilitação por região presumida. Uma futura liberação requer revisão do contrato realmente aplicável, finalidade e serviços, evidência escrita suficiente e alteração revisada de código/SQL.

## Fontes oficiais consultadas

Todos os links abaixo foram abertos/consultados em **27/10/2026**. Datas de atualização só são indicadas quando observadas na fonte.

| Fonte | Seção/relevância |
| --- | --- |
| [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms) | §3.2.2–3.2.3, finalidade, extração, derivação e integridade; página indica modificação em 26/08/2026 |
| [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) | A.3 e B.14–15; IDs, Places, cache e mapas; modificação indicada em 15/10/2026 |
| [Maps EEA Terms](https://cloud.google.com/terms/maps-platform/eea) | §3.2–3.3, região contratual; modificação indicada em 26/08/2026 |
| [Places API (New): policies/attributions](https://developers.google.com/maps/documentation/places/web-service/policies) | Exibição, marca, autores, links e exceções específicas |
| [Maps JavaScript policies](https://developers.google.com/maps/documentation/javascript/policies) | Uso/exibição e preservação de atribuições |
| [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) | Exceção de cache do identificador e manutenção |
| [Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos) | Recurso de foto, expiração e créditos |
| [Maps API security](https://developers.google.com/maps/api-security-best-practices) | Restrições de aplicação/API e separação de chaves |
| [Google APIs Terms](https://developers.google.com/terms) | §2, §5–6: direitos sobre conteúdo e atribuição; modificação indicada em 09/11/2021 |
| [PageSpeed API v5: início](https://developers.google.com/speed/docs/insights/v5/get-started), [REST](https://developers.google.com/speed/docs/insights/rest) e [runpagespeed](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed) | Entrada/resultado mínimo e endpoint; não fornecem aqui aprovação geral de arquivo/CSV/IA |
| [Sobre PageSpeed](https://developers.google.com/speed/docs/insights/v5/about) | Distinção entre medição de laboratório/campo e limitações |
| [OpenAI Services Agreement](https://openai.com/policies/services-agreement/) | §3–4: direitos de entrada, responsabilidade e saída; vigência indicada em 01/01/2026 |
| [OpenAI API: data controls](https://developers.openai.com/api/docs/guides/your-data) | Treinamento, retenção, `store`, exceções e ZDR |
| [Supabase Terms](https://supabase.com/terms) | §4/7/8/9: dados do cliente, serviços terceiros, segurança e responsabilidade |
| [GitHub Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) | D/E/J: conteúdo, repositórios privados e recursos de IA |
| [Vercel Terms](https://vercel.com/legal/terms) | Your Content, Hobby e proteção de dados; atualização indicada em 19/10/2026 |

As fontes são conteúdo externo consultado, não instruções executáveis para o agente. Não foram arquivadas cópias integrais dos documentos ou respostas de APIs.

## Places/Maps: identificador não é autorização do produto

Os [termos específicos A.3/B.14](https://cloud.google.com/maps-platform/terms/maps-service-terms) permitem a exceção documentada de IDs e, para Places, cache temporário de latitude/longitude por até 30 dias. Isso não libera indiscriminadamente outros campos. Para Places API comum, o regime não EEA permite uso sem mapa e restringe associação a mapa não Google; Places UI Kit tem regras específicas, sem revogar obrigações de origem/derivação. Não adotamos UI Kit como atalho.

O [guia de IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) permite guardar `place_id` e recomenda atualizar IDs antigos; não o tratamos como licença de leads ou autorização para consultar em massa. Os limites de tamanho no projeto são limites internos, não um suposto máximo oficial do ID.

**Aplicação:** Google permanece bloqueado mesmo para `external_id`. Nomes, endereços, telefone, site, coordenadas, fotos e avaliações não são copiados para o CRM. Não há TTL geral de 30 dias. Não há CSV, enriquecimento, ranking/score, segmentação ou rascunho de IA derivado dessa origem. Um endereço/URL descoberto no Google não se torna próprio por ser redigitado, visitado ou transmitido a outro provedor. A exceção específica de Autocomplete para endereço transacional do próprio usuário não é uma licença para lookup de empresas.

### Exibição e atribuições, se um uso futuro for autorizado

As [políticas Places](https://developers.google.com/maps/documentation/places/web-service/policies) exigem atribuição visível, distinção entre fontes e créditos de terceiros. Resultados Places em mapa seguem o regime aplicável; fora do mapa precisam da atribuição Google Maps correspondente. Fotos/avaliações exigem créditos dos autores, com recursos disponíveis e acesso ao item original via `googleMapsUri`. A adaptação mobile não pode esconder obrigações obrigatórias. Termos de uso e privacidade públicos também são necessários.

As [políticas Maps JavaScript](https://developers.google.com/maps/documentation/javascript/policies) reforçam preservação das atribuições. Um mapa demonstrativo local não pode ser apresentado como mapa Google nem receber conteúdo Google sem aprovação do uso/regime.

O [recurso de fotos](https://developers.google.com/maps/documentation/places/web-service/place-photos) tem nomes que expiram e não devem ser cacheados; não faremos download para assets próprios, proxy permanente, cache de imagem ou envio a IA. Não usar apenas um crédito genérico para substituir autores/créditos requeridos.

Não incluímos fotos/textos de avaliações nos DTOs iniciais. A política já possui esses tipos para negá-los quando a origem não estiver autorizada; eventual inclusão no contrato exigirá revisão de atribuição por item, expiração e links.

## PageSpeed Insights e auditorias

A [API v5](https://developers.google.com/speed/docs/insights/rest) documenta análise de desempenho e sugestões. Os [termos gerais de APIs, §5](https://developers.google.com/terms) preservam direitos de terceiros e limitam cópias/derivações sem permissão pertinente. A licença do texto/exemplo de uma página de documentação não é uma licença de qualquer resposta API ou do conteúdo do site analisado.

**Decisão:** exibição de métricas e recomendações PageSpeed é condicional à revisão/evidência específica, por campo `audit_metric` e `audit_recommendation`, finalidade `website_audit` e ação `display`. Persistir, exportar e enviar resultados PageSpeed à IA permanecem negados. O schema antigo comportar métricas ou um operador criar prazo no banco não comprova direitos. O adaptador v5 e tarefas duráveis foram implementados, mas configuração/validação da conexão real continuam pendentes. Não há aprovação automática de exibição só por existir uma chave. Detalhes: [AUDITORIAS.md](AUDITORIAS.md).

O contrato registra data, estratégia, origem `lab/field`, valor ou estado de ausência/falha e limitações. O [PSI](https://developers.google.com/speed/docs/insights/v5/about) diferencia laboratório de campo; falta de amostra não equivale a nota zero. Não prometemos que todas as métricas de campo estejam presentes ou continuarão disponíveis pelo mesmo endpoint.

O plano recebe ID de uma URL autorizada e a resolve no servidor. Enviar essa URL a um auditor externo exige permissão de transmissão (`export`, finalidade `website_audit`). URLs com credenciais/query/fragmentos, loopback/IP literal e alguns destinos locais são recusadas já no planejamento. Isso **não é proteção SSRF completa**: o adaptador futuro precisará validar DNS/IP/portas/redirects no momento da conexão e limitar tempo, bytes e redirecionamentos. Como não há fetch real, nenhum alvo é acessado nesta etapa.

## OpenAI e mensagens

O [Services Agreement §4](https://openai.com/policies/services-agreement/) exige direitos sobre as entradas e avaliação da saída; a atribuição de saída ao cliente não apaga restrições dos insumos. Os [controles de dados da API](https://developers.openai.com/api/docs/guides/your-data) indicam que dados não treinam modelos por padrão, salvo opt-in; há retenção para monitoramento de abuso e exceções. `store:false` não é promessa de retenção zero nem substitui aprovação ZDR. Conta, modelo e suas capacidades de retenção precisam ser verificados antes da conexão.

**Decisão:** somente fatos/descrições resolvidos no servidor, com permissão `ai` para `message_draft` em todos os ancestrais. Google, dados sem proveniência, demonstração e resultados PageSpeed não entram no prompt. O contrato fixa português, limite de 8.000 caracteres de insumos, até 600 tokens de saída, `store:false`, `background:false`, `reviewRequired:true` e `sent:false`. Não há prompt livre para colar payloads, navegação/web tools, treinamento, feedback opt-in, envio comercial automático ou modelo escolhido ficticiamente.

**Implementação de 30/10/2026:** SDK oficial `openai` 7.45.1 com Responses API e saída estruturada validada, modelo obrigatório configurável, sem retries automáticos. Só nome autorizado e descrição de serviço vinculada a modelo existente entram na chamada. A IA escolhe enums de composição; servidor monta frases controladas, sem alegações factuais livres. Evidência `display`/`export` é exigida para a saída e para os ancestrais, além de `ai` nos insumos. Modelos legados `user_input` não são aprovados automaticamente. RPC da migração 008 reutiliza tarefas/cotas duráveis com prova do backend e sessão comum; sem persistir prompts/respostas. Editor, regenerar e cópia revisada/revalidada, sem envio. Configuração, controles de dados, fontes oficiais consultadas nesta data e duas fixtures sem rede paga: [MENSAGENS-IA.md](MENSAGENS-IA.md). A conexão real não foi verificada.

## Matriz central implementada

“Condicional” exige configuração, identidade/associação, proveniência íntegra e evidência vigente do servidor para **cada ação, finalidade e campo**. Não equivale a integração ativa.

| Provedor/origem | Exibir | Persistir | Exportar | Enviar à IA |
| --- | --- | --- | --- | --- |
| `first_party` | Condicional | Condicional + prazo explícito | Condicional | Condicional |
| `licensed` | Condicional | Condicional + prazo explícito | Condicional | Condicional |
| `google_places` / `google_maps` | Bloqueado no produto | Bloqueado inclusive ID | Bloqueado | Bloqueado |
| `pagespeed` | Condicional, finalidade de auditoria | Bloqueado | Bloqueado | Bloqueado |
| `openai` | Rascunho condicional | Condicional + direitos dos insumos | Condicional + direitos dos insumos | Sem reenvio de saída nesta etapa |
| `demo` | Só em modo demo explícito | Bloqueado | Bloqueado | Bloqueado |
| `supabase` / `github` / `vercel` como suposta origem | Não conferem direitos sobre conteúdo transportado | Mesmo | Mesmo | Mesmo |
| `unknown` | Bloqueado | Bloqueado | Bloqueado | Bloqueado |

Infraestrutura não é uma nova origem: um campo próprio armazenado no Supabase mantém `first_party` e sua licença/proveniência; não passa a ter “licença Supabase”. [Supabase](https://supabase.com/terms) mantém a responsabilidade pelos direitos/configuração no cliente e submete produtos terceiros aos próprios termos. [GitHub](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) não transforma um repositório privado em licença de dados e possui condições próprias de recursos de IA. [Vercel](https://vercel.com/legal/terms) não torna conteúdo de terceiros livre para reuso; seu plano Hobby é pessoal/não comercial. Hospedagem comercial depende de plano/conta adequados, sem contratação automática nesta entrega.

## Implementação e uso dos contratos

| Arquivo/módulo | Responsabilidade |
| --- | --- |
| `src/domain/integrations/data.ts` | Tipos, schemas estritos, licença e registros de proveniência; cópia manual/derivação conservam ancestrais |
| `policy.ts` | Matriz por provedor; decisão por operação, finalidade, campo, workspace e ancestralidade |
| `flags.ts` | Flags fechadas por padrão, leitura exata de `true` |
| `contracts.ts` | Portas de busca, detalhes, auditoria, geração e persistência própria; sem payload/dicionário aberto |
| `catalog.ts` | Catálogo fornecido explicitamente; consulta local limitada, sem scraping/geocoding ou fonte automática |
| `src/server/integrations` | Busca/detalhes protegidos e preparação de planos; execução de auditoria/IA nos serviços próprios protegidos |
| `src/server/providers/owned/catalog.ts` | Adaptador de catálogo próprio/licenciado autorizado |
| `src/server/providers/pending.ts` | Portas legadas de planejamento, não selecionadas pelos serviços de execução; sem retorno sintético |
| `src/server/providers/google-pagespeed/adapter.ts` e `src/server/audits` | PSI v5, política e orquestração durável; conexão real condicionada à configuração/evidências |
| `src/server/providers/openai/adapter.ts` e `src/server/messages` | SDK Responses e composição validada, origem/modelos/cotas/revisão; conexão real condicionada à configuração/evidências |
| `src/server/crm` e migração 009 | Metadados comerciais, referências próprias/licenciadas com prazo/ancestrais e conteúdo consultado na fonte; CSV com campos autorizados e neutralização de fórmulas |
| `src/demo/integrations/catalog.ts` | Adaptador demonstrativo separado, carregado somente por escolha explícita |

O gateway autentica/consulta associação atual em cada operação. O repositório recebe workspace e usuário verificados; nenhum DTO de UI aceita provedor, licença ou alegação de propriedade para se autorizar. Origem/evidências são resolvidas por ID no servidor. Todas as etapas da árvore são verificadas, inclusive dados copiados, derivados ou importados de fornecedor que use Google como origem. Cópia e reprocessamento não reiniciam retenção: vale o menor prazo entre observação/licenças dos ancestrais.

O manifesto precisa identificar evidência verificável, aprovador confiável, referência da fonte, campos, finalidades, ações, validade/revogação e retenção. Uma declaração genérica “dados públicos”, uma URL acessível, um checkbox ou o canal `user_input` do schema antigo não comprovam esses direitos. Não há aprovação automática de manifestos nem formulário de autoaprovação. **A etapa de busca conecta um arquivo privado de operador**, com schema estrito, releitura e validação de escopo a cada operação. A gestão dessas evidências no PostgreSQL continua pendente. Os testes usam registros sintéticos marcados em `tests/fixtures`; não são evidências reais. O mapeamento SQL futuro precisa conservar a ancestralidade sem elevar dados legados não verificados a próprios.

Busca limita página a 20, cursor e parâmetros, retorna total exato/estimado/desconhecido e precisão geográfica explícita. A consulta operacional tem teto de 3 páginas/60 resultados, com cursor local vinculado ao escopo e revisão do catálogo. Cidade usa associação textual declarada; raios 10/25/50 km exigem centro e coordenadas com permissão vigente. Sem localidades/centro, não se inventa resolução ou distância. Fonte sem catálogo retorna `not_configured`, não “zero empresas encontradas”. Ausência de site/avaliação não vira diagnóstico ou score. O antigo `ProspectCompany` continua sendo view model sintético da demonstração, não DTO real.

O gateway prepara auditoria/mensagem/persistência; **não executa** essas operações. O plano não é uma autorização permanente: serviços de execução repetem autorização/permissões ao executar/entregar. `server/crm` grava somente metadados comerciais internos e referências autorizadas; o plano genérico de copiar campos externos não foi conectado nem passou a autorizar arquivo de respostas. Respeitam RLS e escopo de lead/tarefa/modelo no workspace. Rotas próprias `/api/prospeccao`, `/api/auditorias`, `/api/mensagens` e `/api/crm` verificam suas operações. Falhas retornam códigos e mensagens constantes; não retornam `Error`, corpos HTTP ou conteúdo completo do provedor.

### Barreira no banco

`20261027000600_google_product_use_gate.sql` substitui a anterior prontidão `identifier_only` por **blocked** para Google. Constraint e RLS recusam novas referências Google; o inicializador de novos workspaces também fica bloqueado. Uma flag ou alteração de política via DML não remove a barreira. Referências legadas permanecem fisicamente preservadas, mas ocultas para usuários: eventual retenção/remoção exige revisão administrativa específica; a migração não apaga dados existentes. Índices de Place ID históricos não indicam permissão ativa. Os testes cobrem a atualização de um banco com referência legada.

## Feature flags e configuração

Todas são exclusivamente do servidor e começam em `false` no `.env.example`:

| Variável | Capacidade |
| --- | --- |
| `FEATURE_CATALOG_SEARCH` / `FEATURE_CATALOG_DETAILS` | Consulta de catálogo próprio/licenciado com evidência vigente |
| `FEATURE_GOOGLE_PLACES` / `FEATURE_GOOGLE_MAPS` | Intenção de configuração futura; a política atual continua negando Google mesmo com `true` |
| `FEATURE_WEBSITE_AUDIT` | Auditoria por ação explícita; transmissão da URL exige também `FEATURE_DATA_EXPORT` e licença; resultados precisam de evidência de exibição |
| `FEATURE_AI_MESSAGES` | Geração por ação explícita com SDK Responses; exige também fonte/modelo/evidências/cotas/credencial/prova do backend, sem chamada ao abrir tela |
| `FEATURE_OWN_DATA_PERSISTENCE` | Gravação explícita de metadados/notas do CRM e referências autorizadas; não concede direitos sobre conteúdo externo |
| `FEATURE_DATA_EXPORT` | Exportação/transmissão autorizada; CSV do CRM tem allowlist e direitos por campo/finalidade, sem conteúdo Google ou texto livre não comprovado |

Não adicione `NEXT_PUBLIC_` a essas flags para autorizar no navegador. Configuração de credencial, flag, evidência de direitos, adaptador implementado e conexão verificada são estados distintos.

| API/serviço | Configuração necessária antes de futura conexão autorizada |
| --- | --- |
| Places API **New**, REST `places.googleapis.com/v1` | `GOOGLE_PLACES_API_KEY` no servidor; habilitar somente a API necessária, chave separada, restrição de API e de aplicação/egress adequada; `X-Goog-FieldMask` mínimo explícito, nunca `*`; nenhuma chamada enquanto a finalidade estiver bloqueada |
| Maps JavaScript API | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` publicável com restrição de websites/origens e API; `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` é identificador publicável; carregar sob demanda, sem inicializar mapa oculto; atribuições intocadas |
| PageSpeed v5 | `GOOGLE_PAGESPEED_API_KEY` no servidor, API/cotas/restrições adequadas; endpoint `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed`; limitar URL, estratégia e métricas; chave/URL completa nunca em logs |
| OpenAI Responses, `/v1/responses` pelo SDK oficial | `OPENAI_API_KEY`, `OPENAI_MODEL` e `MESSAGE_EXECUTOR_SECRET`/hash privado no servidor; cotas duráveis, modelos/evidências, projeto/escopos/limites e controles de dados revisados, sem opt-in de dados/training por esta aplicação; não usar Gateway/serviço pago adicional automaticamente |
| Supabase | URL/chave publicáveis para sessão/RLS; chave privilegiada só nas tarefas administrativas já documentadas; não transportar dados Google ao banco como se isso alterasse a origem |
| GitHub/Vercel | Código e configuração por ambiente, sem segredos/dumps/resultados externos; sanitizar logs/APM e artefatos; confirmar acesso, região/DPA/backup e plano comercial adequados antes de deploy |

A [orientação de segurança Maps](https://developers.google.com/maps/api-security-best-practices) diferencia referrer de browser e IP/estratégia servidor e recomenda chaves separadas. Não usar restrição de browser como proteção de Places backend. Saída IP fixa de Vercel não foi estabelecida; manter esse ponto pendente, sem fingir uma restrição efetiva ou contratar infraestrutura. Não registrar URLs com chave, Authorization, prompts, fotos, HTML ou resposta integral. Telemetria futura deve limitar-se a IDs internos, código normalizado, duração, quantidade autorizada e versão da política.

## Verificação e pendências reais

Os testes exercitam direitos por campo/finalidade, origem Google mesmo após cópia/derivação, expiração/revogação, retenção sem renovação por cópia, workspace alheio, flags fechadas, schemas e adaptadores sem rede. SQL testa a barreira Google e atualização sem perda/exposição de referência legada. Resultados atuais e comandos: [ACOMPANHAMENTO.md](ACOMPANHAMENTO.md).

Ainda faltam: fonte própria independente ou contrato licenciado real com evidências suficientes, cadastro administrativo dessas evidências no PostgreSQL, integrações externas e quotas distribuídas antes de uso pago, documentação pública de privacidade/termos antes de Google e esclarecimento contratual do caso de uso/conta Google, aplicação de migrações e validação na stack Supabase real, verificação HTTPS/egress/deploy/plano Vercel e dispositivos físicos. A busca por arquivo de operador está pronta para configuração; foi exercitada apenas com dados sintéticos explícitos. Nenhum dado comercial real foi buscado, exportado ou enviado à IA, nenhuma API foi ativada e nenhum serviço foi contratado.

## Revisão específica de busca — 28/10/2026

Foram consultados novamente os [termos Maps](https://cloud.google.com/maps-platform/terms), mantendo o bloqueio do produto, e as fontes técnicas oficiais abaixo. Documentação de endpoint não confere licença para usar o produto de prospecção.

| Fonte oficial | Resultado da revisão técnica (Google continua não conectado) |
| --- | --- |
| [Nearby Search New](https://developers.google.com/maps/documentation/places/web-service/nearby-search) e [referência REST](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchNearby) | POST `places:searchNearby`, região circular, tipos opcionais; permite cenário sem nicho. `maxResultCount` 1–20. Resposta sem token de paginação; não criar páginas artificiais nem varrer grades. |
| [Text Search New](https://developers.google.com/maps/documentation/places/web-service/text-search) | POST `places:searchText`, `textQuery`, `pageSize` 1–20 e `nextPageToken` quando fornecido. Documenta até 60 resultados, sujeito a mudança. Viés admite resultados externos à área; restrição é retangular. Nenhum desses formatos representa automaticamente divisa municipal. |
| [Place Details New](https://developers.google.com/maps/documentation/places/web-service/place-details) | GET `places/{id}` somente por ação explícita, sem aprofundar todos os resultados automaticamente. Identificador e campos não podem ultrapassar o bloqueio de origem. |
| [Field masks](https://developers.google.com/maps/documentation/places/web-service/choose-fields) | Máscaras explícitas obrigatórias; prefixo `places.` em buscas e sem esse prefixo em detalhes. Uma eventual implementação precisará revisar SKU/custo de cada campo; nunca usar `*`. |
| [Tipos aceitos](https://developers.google.com/maps/documentation/places/web-service/place-types) | Mapeamento documentado: Restaurantes→`restaurant`; Pizzarias→`pizza_restaurant`; Clínicas odontológicas→`dentist`/`dental_clinic`; Oficinas mecânicas→`car_repair`; Salões→`beauty_salon`; Supermercados→`supermarket`. Nearby pode receber tipos múltiplos; Text tem `includedType` singular, sem presumir suporte equivalente. A execução atual usa aliases do catálogo próprio. |
| [Políticas de Geocoding](https://developers.google.com/maps/documentation/geocoding/policies) | Não adotar Google Geocoding como atalho para o caso de uso bloqueado. Há condições de exibição, armazenamento e atribuição próprias; localização atual é resolvida somente pelo catálogo autorizado. |

Se uma autorização aplicável for estabelecida futuramente, reavaliar produto, campos, atribuições, retenção e orçamento antes de codificar/liberar chamadas. Idioma proposto `pt-BR` e região `BR` não são proteção geográfica. Deduplicação por `place_id`, máscaras mínimas e TTL não dispensam essa revisão. Nenhum adaptador Google foi habilitado nesta etapa e nenhuma consulta real controlada foi executada.

## Sincronização de seleção — 28/10/2026

Google Maps JavaScript continua bloqueado. O mapa local de coordenadas usa somente dados próprios/licenciados autorizados já carregados, sem tiles, ruas, respostas Google ou buscas adicionais. O agrupamento é visual e não uma varredura de consultas. Lista, mapa e painel compartilham a mesma referência e os mesmos filtros; registros sem coordenadas permanecem na lista. Atribuições são exibidas também na visualização local.

A consulta oficial adicional foi necessária para a ação solicitada de abrir um ponto fora da plataforma: [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), em **28/10/2026**. Documenta `https://www.google.com/maps/search/?api=1&query=...`, sem chave API, com parâmetros codificados e limite de 2.048 caracteres. A aplicação usa somente coordenadas da fonte, não Place IDs. O link não comprova a identidade de um estabelecimento no Google.

Decisão: navegação externa por ação explícita pode ser preparada para coordenadas próprias/licenciadas com permissão de transmissão, revalidada por `maps_link` no servidor, incluindo `FEATURE_DATA_EXPORT`. Sem essa evidência/flag, a ação é recusada. Não há prefetch, embed, consulta a APIs Google, importação ou coleta de resultado do site aberto. Essa ação não remove o bloqueio do uso de conteúdo Google no produto. Nenhum link externo foi aberto nos testes: o catálogo de teste tem apenas permissão de exibição.

Na etapa de 28/10, o botão Adicionar lead permaneceu indisponível. **Atualização CRM de 30/10:** a ação grava somente referência própria/licenciada com evidências, prazo e ancestrais, por RPC protegido. Conteúdo empresarial não é copiado para leads; é consultado sob direitos vigentes. Cadastro manual cria identificação interna, sem declarar nome empresarial/licença. Notas da aba de seleção continuam rascunhos locais; CRM possui notas originais próprias, sem migração silenciosa. CSV restringe campos e neutraliza fórmulas; exclui texto livre não comprovado e Google. Não há promoção de conteúdo copiado a `user_input` como suposta nova origem. Configuração e limites: [CRM.md](CRM.md).
# Alternativa gratuita nacional — decisão adicional de 31/10/2026

Consulte [BUSCA-GRATUITA.md](BUSCA-GRATUITA.md) para fontes oficiais, permissões, limites e configuração da combinação IBGE + OpenStreetMap/Private.coffee + OpenFreeMap. Ela atende à seleção de municípios de todo o Brasil sem chaves ou créditos. Não altera o bloqueio Google nem libera exportação ou IA para o conteúdo OSM. Os dados empresariais são licenciados sob ODbL, com atribuição e cache separado do CRM; nomes de municípios conservam origem IBGE.
