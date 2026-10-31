# Busca de empresas — 28/10/2026

## Implementação disponível

A rota privada `/prospeccao` pode consultar um **catálogo próprio ou licenciado aprovado por operador**. Há leitura real do arquivo configurado no servidor, autenticação Supabase/RLS, busca e detalhes sob demanda; não existe fallback demonstrativo. Sem arquivo, mantém o estado sem fonte. Arquivo inválido/inacessível, licença vencida ou feature flag fechada não viram zero resultados.

Google Places/Maps permanecem bloqueados pela política de produto e pela migração 006. A revisão oficial de 28/10/2026 não estabeleceu autorização diferente para o caso de uso. Não foram implementadas chamadas Nearby/Text/Details/Geocoding que contornem essa barreira. A ausência de chave é separada da ausência de permissão. Ver [integracoes.md](integracoes.md).

## Configuração de uma fonte real

1. Um operador confiável revisa a origem independente, direitos por campo/finalidade/ação, atribuições, vigência, ancestrais e identidade do aprovador. Evidências devem existir fora do JSON e continuar acessíveis à revisão administrativa. Um registro digitado ou um `approvedBy` preenchido não prova esses direitos. Não copie conteúdo Google, incluindo suas coordenadas, como se fosse próprio.
2. Prepare um JSON estrito conforme `src/domain/integrations/catalog-manifest.ts` (versão **1**): `workspaces[]`, cada qual com `workspaceId`, `licenses[]`, `provenance[]` e `sources[]`. Cada fonte contém `id`, `label`, `provider` (`first_party` ou `licensed`), `provenanceId` de âncora, `locations[]` e `companies[]`. Use somente projeções normalizadas dos contratos, nunca respostas brutas.
3. Cada campo conhecido de empresa e cada referência exige seu registro de proveniência. Cada localização tem `id`, `city: {provenanceId,value}` e `center: null` ou `{provenanceId,latitude,longitude}`. Cidade e centro também exigem direitos de exibição para prospecção; o centro é opcional. Use nomes qualificados (cidade/UF/região) consistentes com os registros do catálogo, evitando seleções ambíguas. Campos não consultados/ausentes mantêm seu estado; não preencher notas, avaliações ou diagnósticos fictícios.
4. Coloque o arquivo em diretório privado do servidor, por exemplo `.local-data/fonte-ag.catalog.local.json`, com acesso de escrita restrito ao operador. Esse diretório e `*.catalog.local.json` são ignorados pelo Git. O adaptador recusa arquivos dentro de `public`, `.next/static` e caminhos de rede UNC. Evidências/manifestos não são aceitos por formulário, endpoint de upload ou DTO de busca.
5. Configure no ambiente do servidor:

```dotenv
OWNED_CATALOG_FILE=.local-data/fonte-ag.catalog.local.json
FEATURE_CATALOG_SEARCH=true
FEATURE_CATALOG_DETAILS=true
```

Supabase Auth também exige `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, migrações aplicadas e usuário confirmado associado ao workspace ativo. Não é usada chave privilegiada para buscar dados ou contar leads. Não forneça segredos pelo chat.

Reinicie após mudar variáveis. O manifesto é relido em cada operação; atualize-o por substituição atômica. Revogar/remover evidência passa a recusar a próxima operação. Conteúdo já recebido pelo navegador não pode ser retroativamente recolhido; em nova recusa de permissão, a tela limpa os resultados mantidos. Não há cache persistente nem gravação de histórico/resultados nesta etapa.

O arquivo é uma configuração administrativa local protegida, **não** um substituto já implementado para gestão de evidências no PostgreSQL. Vercel precisa receber esse artefato de forma privada no runtime; arquivos ignorados não aparecem num deploy Git automaticamente. Não houve deploy/provisionamento dessa fonte, nem inclusão de dados reais em Git, assets ou logs. Não publique o manifesto e não use o arquivo sintético dos testes como autorização real.

## Modos e localização

- **Busca livre:** todos os segmentos disponíveis que correspondem à localização. Não exige categoria e não promete encontrar todas as empresas da cidade.
- **Por nicho:** seleção em português; o catálogo próprio usa aliases de categoria normalizados, sem acentos/caixa. Não inferimos especialidades a partir de avaliações ou da IA. Mapeamentos aceitos para eventual revisão Google estão em `categories.ts`; não executam chamadas nem liberam a política.
- **Palavra-chave:** busca textual no nome/categoria do catálogo, incluindo “pizzaria”, “clínica odontológica” e “oficina mecânica”. Correspondência textual simples, sem prometer equivalência semântica de um motor externo.

O serviço adequado aqui é o **registro de localidades da própria fonte**. A UI escolhe um ID, e o servidor resolve cidade e centro autorizados; não geocodifica texto arbitrário nem aceita coordenadas do usuário como suposta origem própria. Só aparecem as localidades com permissão vigente. Não há pesquisa automática ao digitar, mudar de aba ou mover um mapa.

“Cidade” compara a cidade declarada no catálogo. `geographicMatch: approximate` deixa explícita a ausência de polígonos e de verificação de divisas. Não é um censo municipal. Raios de 10/25/50 km usam Haversine, esfera com raio médio de 6.371,0088 km, a partir do centro declarado e aprovado; a restrição de distância é aplicada no servidor. Podem incluir municípios vizinhos. Não são trajetos, polígonos municipais ou `locationBias`. Registros sem coordenadas não entram no raio e a UI informa quantos registros do catálogo não puderam ser avaliados; a cobertura permanece parcial. Sem centro autorizado, os raios ficam indisponíveis.

## Limites, paginação e segurança

`POST /api/prospeccao` aceita apenas JSON de até **8 KiB**, mesma origem canônica e comandos estritos `options`, `search` ou `details` com workspace. Valida `getUser` e associação atual, resolve fonte/evidências no servidor e reaplica a política por campo/ancestrais. O proxy renova cookies também nessa rota. Respostas são privadas/no-store; a requisição não aceita chaves, licenças, URLs de API ou payloads arbitrários.

O manifesto tem até **8 MiB**, 20 workspaces, 10 fontes/workspace, 1.000 empresas/fonte e 200 localidades/fonte. Não é um pipeline de importação ilimitada. A consulta operacional usa **20 itens/página**, **3 páginas/60 resultados** por busca. O cursor local vincula filtros, workspace e revisão do arquivo, aceita apenas offsets 20/40 e é recusado após alterações. Ele **não é um token Places**, nem serve como autorização; cada página repete verificações. A deduplicação usa a referência nativa dentro da fonte. `place_id` continua bloqueado para dados Google; não alegamos ter deduplicado Places reais.

Há até **2 operações simultâneas e 60 ações/minuto por usuário/workspace/processo**, mapa limitado a 1.000 entradas e expiração em 60 s. Esse limite em memória **não coordena instâncias Vercel**. Antes de qualquer provedor pago, será necessário consumo/reserva global confiável no banco conforme seus custos; não se deve apresentar esse limitador local como quota distribuída.

Deadline de **8 s no Route Handler**, incluindo sua leitura/autorização, e até **20 s** por ação no cliente, incluindo proxy, transporte e tentativas. O tempo do handler não é promessa de duração total da rede ou da renovação anterior de sessão no proxy. Cancelamento usa AbortSignal e descarta respostas antigas; interromper uma requisição HTTP é melhor esforço, não garantia de encerrar uma operação já iniciada em outro servidor. A leitura verifica cancelamento entre blocos, limita bytes e fecha o arquivo. A API não prossegue para leitura de fonte depois de expirar a autorização inicial.

O cliente repete no máximo **duas vezes**, com espera de 500/1.000 ms, somente falhas de transporte ou indisponibilidade HTTP transitória/429 elegível. Respeita `Retry-After`; esperas maiores que 2 s retornam o estado de limite ao usuário, sem repetição imediata. A API local retorna `Retry-After: 60` ao limitar ações. Ausência/configuração inválida, direitos, sessão, parâmetros e flags não são repetidos automaticamente. Erros são normalizados; nunca devolver exceção, corpo do provedor, caminhos de arquivo ou evidência de licença. Não há varredura por grades nem orçamento comercial consumido.

## Interface e contagens

Mantém a composição escura/dourada: filtros à esquerda, mapa ao centro, resultados abaixo e detalhes à direita. Google não é inicializado. Havendo resultados, a aba Mapa carrega sob demanda uma projeção local de coordenadas aprovadas, com agrupamentos, ampliação e atribuições; não desenha ruas/divisas nem simula Google Maps. Marcadores, membros de agrupamentos e linhas compartilham seleção e detalhes sob demanda. O filtro dos resultados carregados também vale no mapa e remove seleções que deixaram de corresponder. Empresas sem coordenadas continuam na lista.

No celular, uma busca explícita abre a lista, filtros são expansíveis e detalhes usam drawer com Escape/foco de retorno. Tabelas rolam no componente; no celular há cards. Abas, campos e ações funcionam com teclado. Anotações são rascunhos em memória por fonte/empresa, perdidos ao recarregar. Adicionar lead está indisponível enquanto o adaptador de gravação com proveniência não estiver conectado. O link externo Google Maps exige nova verificação de identidade/associação e permissão `export` para as coordenadas; não consulta APIs nem usa Place IDs. Detalhes da decisão: [integracoes.md](integracoes.md).

Os indicadores separam **resultados carregados**, **resultados filtrados nesta tela**, **leads salvos no workspace** e **site informado pela fonte**. Leads são contados com sessão/RLS; erro/ausência de contagem vira “—”. Totais do catálogo são correspondências nessa fonte, nunca população empresarial. Ausência de site não vira “sem site”, score ou oportunidade confirmada. Atribuições acompanham resultados e detalhes, sem truncamento silencioso.

Há estados inicial, carregando/cancelável, vazio, parcial (mais páginas ou coordenadas ausentes), limite atingido e erro com nova tentativa. Filtros alterados cancelam a consulta anterior e limpam resultados para não misturar escopos. Erro transitório ao carregar outra página preserva as anteriores. Mudanças de layout/abas mantêm filtros e resultados; nenhuma gravação de leads/notas, auditoria ou geração de mensagem foi antecipada.

## Verificação e pendências

Ver [VALIDACAO-BUSCA.md](VALIDACAO-BUSCA.md) para comandos, matriz e evidências. `tests/fixtures/search-catalog.mjs` contém 75 empresas + uma duplicata, localidades e autorizações **SINTÉTICAS**. Só o servidor E2E 3103 recebe esse arquivo explicitamente; a aplicação normal não importa fixtures nem recebe configuração por fallback.

Nenhuma fonte real aprovada foi fornecida e nenhuma consulta comercial real foi executada. Permanecem pendentes: catálogo/evidências reais, validação Supabase completo (Auth/JWT/PostgREST/PG17), provisionamento privado em hospedagem e aparelho físico/teclado virtual. Google continua bloqueado por permissão; chaves não resolvem isso. Não há escrita/gestão de evidências no banco, integração de fornecedor de catálogo via rede, mapa real, importação de respostas brutas, exportação ou IA nesta etapa.
