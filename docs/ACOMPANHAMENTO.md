# Acompanhamento — AG Prospecção

## Contexto e decisões

Objetivo: prospectar empresas por localização, categoria ou palavras-chave, avaliar oportunidades de serviços digitais e acompanhar o relacionamento comercial em CRM.

Decisões permanentes: [AGENTS.md](../AGENTS.md). Referência principal: `Dashboard de Prospecção com Mapa e Leads.png`, anexada pelo usuário. A referência orienta composição, identidade e organização; seus dados e números não são resultados reais.

Stack definida: Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui personalizado, Supabase Auth/PostgreSQL/RLS, Google Places API (New), Google Maps JavaScript API, PageSpeed Insights, OpenAI no backend, GitHub e Vercel.

Situação inicial em 27/10/2026: diretório vazio, sem arquivos existentes, sem `AGENTS.md` encontrado na hierarquia de diretórios e sem repositório Git. Nenhum aplicativo, pacote ou integração instalado nesta etapa. As versões serão escolhidas e registradas com consulta oficial durante a fundação e a inclusão de cada integração; não há versões implementadas a declarar agora.

As etapas abaixo são uma sequência proposta. Somente a etapa pedida pelo usuário será executada. Alterações de escopo devem ser registradas aqui.

## Critério transversal obrigatório — responsividade

Todas as etapas com interface devem cumprir os requisitos mobile-first de [AGENTS.md](../AGENTS.md), mantendo a identidade preto/grafite/dourado/amarelo. A regra se aplica a autenticação, dashboard, prospecção, CRM, mapas, campanhas, mensagens, relatórios e configurações, conforme cada tela for implementada. Não autoriza antecipar módulos fora da etapa solicitada.

Critérios de aceite para cada etapa com telas:

**Atualização a partir da sincronização de seleção (28/10/2026):** os critérios de qualidade continuam aplicáveis, mas a repetição da matriz completa por etapa foi substituída pelas novas regras de AGENTS.md. Execute somente verificações diretamente relacionadas à alteração; suíte consolidada, múltiplas resoluções e demais verificações transversais ficam para o Prompt 13. Não crie testes para simples textos/estilos nem apague ou enfraqueça os testes existentes. Nesta etapa, apenas seleção e comportamento básico em desktop/mobile.

- Desktop preserva menu lateral, filtros, mapa central, tabela inferior e painel direito, ajustando proporções sem cortes ou sobreposições.
- Mobile tem menu recolhível, indicadores em grade compacta, filtros expansíveis ou em drawer, mapa/lista por abas e detalhes em tela ou drawer adequado.
- Tabelas viram cards quando favorecerem a leitura. Kanban e tabelas podem rolar horizontalmente dentro de seu próprio contêiner; a página inteira não pode rolar horizontalmente.
- Todas as funções permanecem acessíveis em celular, incluindo auditorias, CRM e mensagens com IA. Nenhuma interação depende somente de hover ou de arrastar com o mouse.
- Controles principais têm alvos de toque de pelo menos 44 × 44 px. Textos, campos, rótulos, contraste, foco e navegação por teclado são utilizáveis.
- Menus, abas e drawers têm operação por teclado e gestão de foco adequada; fechamento de painéis devolve foco ao acionador. Ações e campos continuam alcançáveis com teclado virtual, em orientação horizontal e nas áreas seguras do dispositivo.
- Mapas e recursos pesados carregam sob demanda. Verificar que abrir a tela com a lista ativa não inicializa o mapa oculto nem dispara chamadas de seus recursos sem necessidade.
- Testar os fluxos principais em todas as dimensões abaixo, incluindo estados de carregamento, vazio e erro. Cobrir navegação, formulários, filtros, abas, detalhes e ações presentes na etapa.
- Usar capturas e testes automatizados quando disponíveis, verificando transbordamento global, alvos de toque, foco e interações. Inspecionar visualmente sobreposições, cortes e legibilidade; não considerar uma captura isolada prova de interação correta.
- Corrigir falhas de layout e interação antes de concluir a etapa. Registrar testes não executados e limitações reais como pendências, sem tratar documentação ou emulação como validação em dispositivo físico.

### Matriz mínima de validação

Dimensões em pixels CSS; as alturas abaixo são uma base reproduzível para as larguras obrigatórias. Acrescentar outras dimensões quando o conteúdo ou um problema encontrado exigir.

| Viewport (largura × altura) | Contexto | Verificação da base técnica em 27/10/2026 |
| --- | --- | --- |
| 360 × 800 | Celular vertical | Aprovado: base, configurações e menu móvel |
| 390 × 844 | Celular vertical | Aprovado: base, configurações e menu móvel |
| 768 × 1024 | Tablet vertical | Aprovado: base, configurações e menu móvel |
| 1024 × 768 | Tablet horizontal / desktop compacto | Aprovado: base, configurações e navegação lateral |
| 1366 × 768 | Desktop | Aprovado: base, configurações e navegação lateral |
| 1536 × 960 | Desktop amplo | Aprovado: base, configurações e navegação lateral |
| 800 × 360 | Celular horizontal | Aprovado: base, configurações e menu móvel |
| 844 × 390 | Celular horizontal | Aprovado: base, configurações e menu móvel |

A etapa 2 acrescentou a validação da prospecção em todas essas dimensões e em **1536 × 1024**, com capturas e testes de interação. Resultados por viewport e limites: [VALIDACAO-ETAPA-2.md](VALIDACAO-ETAPA-2.md).

A etapa Auth validou login, recuperação, perfil, redefinição, membros/convites e seleção em 360 × 800, 390 × 844, 768 × 1024, 1024 × 768, 1366 × 768, 1536 × 1024 e 844 × 390. A base/prospecção também foi revalidada na matriz anterior. Evidências e distinção entre fixture local e Supabase real: [VALIDACAO-AUTH.md](VALIDACAO-AUTH.md).

Ao testar cada etapa, registrar data, tela/fluxo, viewport, ferramenta/navegador, resultado, caminho das capturas quando produzidas e problemas/correções. Registrar separadamente a verificação do teclado virtual e das áreas seguras em dispositivo ou ambiente capaz de reproduzi-los; emulação de tamanho de tela, sozinha, não comprova esses comportamentos. A matriz acima é a base; o histórico de cada etapa deve preservar suas próprias evidências.

## Etapas e critérios de aceite

| Etapa | Entrega | Situação |
| --- | --- | --- |
| 0 | Diretrizes e acompanhamento | Concluída |
| 1 | Fundação técnica e versionamento | Concluída localmente; conexão GitHub pendente |
| 2 | Interface fiel à referência em demonstração | Concluída localmente; logo original pendente |
| 3 | Autenticação e persistência protegida | Banco/RLS e Auth SSR implementados, validados localmente com fixture; configuração/validação na stack Supabase real pendentes |
| 3A | Contratos de integração e permissões | Implementados localmente; fontes/evidências reais e conexão dos adaptadores pendentes; Google bloqueado para o caso de uso atual |
| 4 | Busca de empresas e mapa com dados reais | Busca por catálogo autorizado implementada localmente; validação com fonte real e mapa permitidos pendentes |
| 5 | CRM e acompanhamento comercial | Implementado localmente; adicionar, mover e anotar verificados com fixtures/SQL; configuração real e consolidação pendentes |
| 6 | Diagnóstico de presença digital | Auditoria PSI e tarefas duráveis implementadas; dois casos com fixtures aprovados; configuração/validação real e consolidação pendentes |
| 7 | Assistência de IA pelo backend | Implementada sob configuração/permissão; duas fixtures verificadas, conexão real pendente |
| 8 | Exportação autorizada | CSV restrito do CRM implementado a pedido nesta etapa; validação consolidada pendente |
| 8A | Páginas do menu | Dashboard/mapa/campanhas/modelos/relatórios/configurações implementados; um fluxo de navegação/ações aprovado com fixtures; configuração real e consolidação pendentes |
| 9 | Validação integrada e hospedagem | Rodada consolidada local concluída no escopo do Prompt 13; Supabase real e hospedagem pendentes |

### Etapa 0 — Diretrizes e acompanhamento

Critérios de aceite:

- Examinar a pasta e instruções existentes antes de criar arquivos.
- Registrar objetivo, referência visual, stack, limites de escopo, separação de responsabilidades e regras permanentes em `AGENTS.md`.
- Criar este documento com etapas, critérios de aceite e pendências explícitas.
- Manter as funcionalidades da aplicação para as etapas seguintes solicitadas pelo usuário.

### Etapa 1 — Fundação técnica e versionamento

Critérios de aceite:

- Consultar fontes oficiais para versões estáveis compatíveis; criar `docs/VERSOES.md` com versões exatas, links, data e escolhas realizadas.
- Criar Next.js com App Router, TypeScript strict, Tailwind CSS e shadcn/ui preparado para o tema da AG, respeitando a arquitetura de `AGENTS.md`.
- Preparar estilos base e componentes com abordagem mobile-first, viewport apropriado, áreas seguras e foco visível, sem impedir zoom. Qualquer tela criada nesta etapa deve cumprir o critério transversal e a matriz de validação.
- Definir Node.js e gerenciador de pacotes, manter lockfile e scripts de desenvolvimento, lint, tipos e build.
- Criar `.gitignore`, `.env.example` sem segredos e README com instalação e execução reproduzíveis.
- Inicializar Git e preparar o versionamento. Conectar ao GitHub somente com destino e acesso disponíveis; documentar como pendente se ausentes, sem inventar URL ou publicação.
- Verificar instalação reproduzível, lint, tipos e build; registrar bloqueios reais do ambiente.

### Etapa 2 — Interface fiel à referência em demonstração

Critérios de aceite:

- Implementar navegação lateral, cabeçalho, indicadores, filtros, área de mapa, tabela e painel de empresa na composição da referência.
- Personalizar componentes shadcn/ui com tema escuro e amarelo/dourado, tipografia, espaçamento, bordas e hierarquia próximos do mockup.
- Usar português do Brasil; adaptar desktop e telas menores e garantir navegação por teclado, foco visível, rótulos e contraste legível.
- Isolar fixtures demonstrativas e identificar visivelmente o modo demonstração. Indicadores e contagens devem corresponder às fixtures, sem copiar números do mockup como resultados obtidos.
- Permitir testar filtros locais e seleção de empresas de demonstração. Mapa ilustrativo, se usado, deve estar identificado e não se apresentar como Google Maps ativo.
- Ações dependentes de integrações devem informar sua disponibilidade com clareza. Links de módulos fora do escopo não devem simular funcionalidades concluídas.
- Aplicar o critério transversal completo: menu recolhível, filtros expansíveis, abas mapa/lista, detalhes mobile e composição desktop da referência. Validar todas as dimensões da matriz, registrar evidências e corrigir falhas antes da conclusão.
- Executar lint, tipos e build.

### Etapa 3 — Autenticação e persistência protegida

Critérios de aceite:

- Integrar Supabase Auth com o fluxo de acesso definido para o produto e sessões tratadas no servidor.
- Versionar migrations para o esquema mínimo do CRM, com proprietário, constraints, índices e RLS em todas as tabelas de dados de usuários.
- Separar conteúdo comercial do usuário e referências a provedores, deixando a persistência de campos externos condicionada às permissões verificadas na etapa 4.
- Validar e autorizar cada operação protegida no servidor; impedir leitura e alteração entre usuários.
- Verificar usuários não autenticados, sessões inválidas e isolamento de pelo menos dois usuários; verificar policies com o contexto de sessão apropriado.
- Documentar configuração, aplicação das migrations e recuperação de falhas sem registrar credenciais. Não declarar RLS verificado remotamente se o projeto Supabase não estiver disponível.

### Etapa 4 — Busca de empresas e mapa com dados reais

Dependência atual: cumprir a revisão registrada em [integracoes.md](integracoes.md). A consulta Google para o fluxo proposto não está liberada; a implementação real deve usar fonte própria/licenciada autorizada ou depender de revisão contratual específica suficiente. A exceção de cache de place_id não atende esse critério.

Critérios de aceite:

- Consultar documentação e condições oficiais dos provedores, registrando campos, atribuições, limites e direitos em `docs/integracoes.md`; Google permanece bloqueado para o caso de uso atual.
- Implementar localização/região, categoria e palavras-chave com entradas validadas, limites explícitos e tratamento de resultados vazios, erros e limites dos provedores.
- Implementar as opções de abrangência conforme as capacidades reais da API. Não apresentar recorte por município como exato se o método disponível apenas aproximar a área.
- Mostrar lista e detalhes efetivamente retornados da fonte autorizada. Mapa real depende de etapa solicitada e provedor/uso permitido; não incorporar Google para contornar o bloqueio.
- Interpretar ausência de campo como ausência de informação naquela fonte, preservando estados de consulta pendente ou falha.
- Manter credenciais de servidor protegidas e restringir a chave publicável do Maps às origens e APIs necessárias.
- Persistir apenas o conteúdo permitido e separar procedência, identificadores externos e dados próprios. Não armazenar payloads completos por conveniência.
- Verificar contratos com fixtures identificadas e, quando configurado, uma consulta real controlada; registrar quais verificações ocorreram.

### Etapa 5 — CRM e acompanhamento comercial

Critérios de aceite:

- Adicionar empresas aos leads com apenas os dados permitidos; prevenir duplicação do mesmo identificador externo por proprietário.
- Permitir listar, consultar e atualizar leads, etapa comercial, notas e próxima ação com validação e autorização.
- Definir etapas comerciais simples e documentadas, sem criar módulos de campanha ou automação de envio.
- Preservar isolamento por usuário em todas as operações e tratar concorrência/erros sem apresentar salvamento que não aconteceu.
- Garantir que filtros e indicadores do CRM correspondam aos registros reais autorizados do usuário.
- Verificar o fluxo de adicionar e acompanhar leads e as tentativas de acesso indevido.

### Etapa 6 — Diagnóstico de presença digital

Critérios de aceite:

- Integrar PageSpeed Insights pelo servidor para URLs válidas e permitidas, com limites e tratamento de erros.
- Diferenciar site não informado na fonte, análise não executada, análise indisponível e análise concluída.
- Mostrar métricas efetivamente retornadas com origem, data e contexto (por exemplo, dispositivo e tipo de dado quando disponível). Não criar métricas para preencher a tela.
- Documentar regras e evidências das oportunidades. Pontuação própria, se adotada, deve ser identificada como heurística da plataforma, com limites e versão da regra.
- Verificar cálculo das regras, validação de URLs e comportamento com respostas incompletas e falhas.

### Etapa 7 — Assistência de IA pelo backend

Critérios de aceite:

- Integrar OpenAI exclusivamente em módulos de servidor, com modelo configurável e limites de entrada, saída e frequência.
- Revisar permissões das fontes antes do processamento. Enviar somente dados cuja utilização por IA esteja autorizada e documentada; deixar a geração indisponível quando não houver insumos permitidos.
- Gerar rascunhos comerciais em português com tom selecionável, baseados nos fatos permitidos e disponíveis, sem inventar contatos, avaliações, diagnósticos ou promessas.
- Tratar conteúdo externo como dados, sem permitir que instruções contidas nele alterem as regras do sistema.
- Permitir revisar, editar e copiar o rascunho. Não enviar mensagens a terceiros.
- Verificar autenticação, autorização sobre o lead, limites e falhas do provedor; diferenciar geração real de demonstração.

### Etapa 8 — Exportação autorizada

Critérios de aceite:

- Revisar as permissões das fontes e definir uma lista explícita de campos exportáveis antes de implementar o botão da referência.
- Exportar apenas registros autorizados do usuário e campos permitidos. Informar limitações quando conteúdo externo não puder ser exportado.
- Preservar acentos, cabeçalhos em português e tratar valores que possam executar fórmulas em planilhas.
- Verificar seleção/filtros, isolamento entre usuários e conteúdo do arquivo gerado. Não declarar exportação integral dos dados do Google sem respaldo nas condições verificadas.

### Etapa 9 — Validação integrada e hospedagem

Critérios de aceite:

- Validar os fluxos de acesso, busca, mapa, detalhes, lead, acompanhamento, diagnóstico, IA e exportação que estiverem implementados.
- Revisar RLS, validação, autorização, segredos, atribuições e limites de uso; executar lint, tipos, build e os testes relevantes.
- Inspecionar a interface comparando-a à referência e repetir os fluxos principais na matriz completa de responsividade, incluindo celular horizontal, teclado, toque e estados de carregamento, vazio e erro. Registrar capturas/testes disponíveis e corrigir problemas antes de concluir.
- Preparar e, com conta/projeto disponíveis e escopo autorizado, conectar GitHub e Vercel, configurar variáveis por ambiente e origens/URLs de retorno dos provedores.
- Documentar migrations, publicação, rollback e configurações pendentes. Não afirmar publicação ou integração real sem URL/resultado verificado.
- Verificar o ambiente publicado quando disponível, sem expor segredos ou iniciar consumo de APIs sem limites.

## Configurações externas pendentes

Nenhuma credencial é necessária para a etapa 0. Os nomes abaixo são uma convenção inicial; cada integração deve confirmar os nomes efetivamente usados e as exigências atuais da documentação oficial, mantendo `.env.example` e README sincronizados.

| Recurso | Configuração necessária nas etapas correspondentes |
| --- | --- |
| Supabase | Projeto, URL/chave publicáveis, cinco migrações, Site URL/callbacks, confirmação e templates de e-mail, signup fechado e owner provisionado. `SUPABASE_SECRET_KEY` opcional somente para envio administrativo de convite Auth; configuração e roteiro em `AUTENTICACAO.md`. |
| Google Maps | Projeto Google Cloud, Maps JavaScript API habilitada, chave publicável restrita (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), origens permitidas e identificador de mapa se o recurso escolhido exigir. |
| Google Places (New) | API habilitada e credencial exclusiva de servidor (`GOOGLE_PLACES_API_KEY`), com restrições compatíveis com a hospedagem. Confirmar exigência de faturamento, quotas e limites antes do uso real. |
| PageSpeed Insights | API e chave de servidor (`GOOGLE_PAGESPEED_API_KEY`) conforme exigência e quota verificadas na implementação. |
| OpenAI | Projeto, chave de servidor (`OPENAI_API_KEY`), modelo permitido/configurado (`OPENAI_MODEL`) e limites de consumo. |
| GitHub | Conta/conexão autorizada e destino do repositório. Não colocar token em arquivo versionado. |
| Vercel | Conta/projeto, conexão ao repositório e variáveis configuradas nos ambientes adequados. Domínio próprio somente se fornecido ou solicitado. |

Valores secretos devem ser configurados diretamente nos ambientes apropriados, nunca enviados pelo chat. Quando uma conta ou credencial estiver ausente, concluir as partes independentes e registrar separadamente o que foi implementado e o que falta verificar.

## Histórico de execução

### 27/10/2026 — Etapa 0

- Implementado: `AGENTS.md` e este documento, com decisões, sequência proposta, critérios de aceite e configurações pendentes.
- Verificado: inspeção da pasta e busca de instruções na hierarquia antes das alterações; revisão de conteúdo e integridade dos dois arquivos após a criação.
- Limites: nenhum código de aplicação, dependência, teste de aplicação, conexão externa ou publicação nesta etapa.
- Pendências: o usuário indicar a próxima etapa. Credenciais e destinos externos serão necessários somente nas etapas correspondentes; não bloqueiam a fundação e a interface demonstrativa.

### 27/10/2026 — Requisito permanente de responsividade

- Implementado: regras mobile-first em `AGENTS.md`, critério transversal de aceite e matriz de validação com as seis larguras solicitadas e dois viewports de celular horizontal neste documento. Atualizados os critérios de fundação, interface e validação integrada.
- Verificado: releitura dos arquivos existentes antes da alteração e validação documental de cobertura dos requisitos, dimensões e integridade dos arquivos.
- Limites: o projeto continua contendo apenas documentação. Não existem telas, servidor da aplicação ou ferramentas de teste de UI instaladas; não foram produzidas capturas nem executados testes de navegador.
- Pendências: executar a matriz e registrar evidências a partir de cada etapa que criar ou alterar interface. A conformidade visual e de interação ainda não foi verificada.

### 27/10/2026 — Etapa 1: base técnica

- Implementado: Next.js App Router, React, TypeScript strict, Tailwind CSS, shadcn/ui personalizado, módulos por funcionalidade e adaptadores de configuração separados das regras de negócio. Versões exatas e lockfile registrados, sem modificar instalações globais.
- Interface: páginas `/` e `/configuracoes` com Server Components, tema AG, navegação lateral desktop e menu móvel interativo com foco gerenciado. Não é o dashboard da etapa 2.
- Configuração: requisitos independentes de aplicação, Supabase, Places, Maps/Map ID, PageSpeed e OpenAI; leitura no servidor, relatório seguro sem valores, erros por recurso e nenhuma chamada externa ou demonstração automática. Chave privilegiada e executor de tarefas não foram adicionados por não serem necessários.
- Infraestrutura: ESLint, typecheck com geração de tipos de rotas, Vitest, Playwright, README, `.env.example`, `.gitignore`, documentação de arquitetura e Git local inicializado na branch `main`, sem remoto, commit ou push.
- Verificado: `npm.cmd ci --offline=false --cache .npm-cache --no-fund`; `npm.cmd run check` (lint sem warnings, tipos, 18 testes unitários e build aprovados); `npm.cmd run test:e2e` (9 testes aprovados, cobrindo as duas páginas nas oito dimensões e navegação por teclado). Instalação reportou zero vulnerabilidades conhecidas no audit executado naquele momento; isso não constitui garantia permanente.
- Verificado em desenvolvimento: `npm.cmd run dev -- --hostname 127.0.0.1 --port 3101`, com HTTP 200 para `/` e `/configuracoes`, sem `.env.local`; servidor de verificação encerrado após o teste.
- Evidências: capturas das duas páginas em todas as dimensões e do menu nas cinco dimensões móveis, geradas em `test-results/`. Inspeção visual de capturas mobile, desktop e horizontal. Detalhes em [VALIDACAO-ETAPA-1.md](VALIDACAO-ETAPA-1.md).
- Ajustes de verificação: instalação do Chromium necessário ao Playwright; execução dos runners fora do sandbox restrito do Windows devido a subprocessos bloqueados por EPERM; espera da animação de abertura antes das capturas do menu. Configurado `agentRules: false` após detectar a inserção automática de bloco pelo Next dev, preservando as regras do projeto.
- Pendências reais: destinos/acesso para GitHub e Vercel; integrações reais e revisão de permissões de dados nas etapas próprias; teste físico de teclado virtual/áreas seguras. Não há credenciais obrigatórias pendentes para executar a base local. ESLint 9 está compatível com os plugins atuais, mas fora de suporte; atualizar o conjunto quando suportar ESLint 10, conforme `VERSOES.md`.

### 27/10/2026 — Etapa 2: interface de Prospecção de Empresas

- Implementado: menu com todos os itens da referência, item ativo amarelo, plano/consumo ilustrativos e card promocional; cabeçalho com busca, notificações e perfil; título, indicadores, filtros à esquerda, mapa ao centro, tabela inferior, detalhes e mensagens na coluna direita. Tokens de identidade centralizados em `globals.css`, com composição responsiva em `prospecting.css`.
- Composição: menu de 238 px, painel direito de 335 px e centro flexível em desktop. Detalhes passam para drawer abaixo de 1280 px; filtros expansíveis, abas e cards no celular; tabela com rolagem localizada quando necessário. Menu, abas e drawer permitem teclado, com retorno de foco verificado.
- Demonstração: oito empresas sintéticas separadas em `src/demo`; acesso explícito em `/prospeccao/demonstracao`. Mapa local identificado, plano fictício, notas/avaliações/pontuações ilustrativas e mensagens de exemplo identificadas como não geradas por IA. Nenhum número do mockup foi apresentado como resultado real.
- Estados reais: `/` abre `/prospeccao` sem consulta, sem dados simulados e com métricas desconhecidas “—”. A falta de credenciais não ativa demonstração. A base anterior foi preservada em `/base`, e `/configuracoes` continua disponível.
- Interações: filtro de nicho/palavra-chave/oportunidade, ordenação, seleção, leads sem duplicação, notas por empresa e texto editável/copiável na demonstração. Estado somente em memória, sem CRM real, envio, exportação ou chamadas a provedores. Módulos futuros informam indisponibilidade.
- Assets: identificação textual provisória da AG, pois não havia logo original no projeto; foto de estabelecimento fictício gerada com a ferramenta integrada imagegen e salva em `public/demo/pizzaria-ficticia.png`; mapa e laptop ilustrativos em código. Procedência e prompt em `ASSETS-ETAPA-2.md`.
- Verificado: `npm.cmd run check` aprovado (lint, tipos, 22 testes unitários e build); `npm.cmd run test:e2e` aprovado (21 testes). Capturas das três dimensões solicitadas inspecionadas, além de lista mobile e drawer horizontal; 54 capturas no conjunto completo. Sem erros JavaScript, chamadas externas ou overflow global nos fluxos testados.
- Correções: largura mínima do grid que causava transbordamento/sobreposição, espaçamento vertical dos filtros para aproximar a composição da referência, IDs de campos entre drawer e coluna desktop, regressão da base preservada e retorno de foco. Evidências detalhadas em `VALIDACAO-ETAPA-2.md`.
- Pendências reais: arquivo original da logo, validação física de teclado virtual/áreas seguras e integrações das próximas etapas. Nenhuma credencial é necessária para executar ou revisar esta interface demonstrativa. Não foram iniciadas as etapas 3 a 9, nem feitos push ou deploy.

### 27/10/2026 — Banco SQL multiworkspace (parte da etapa 3)

- Implementado: quatro migrações SQL transacionais, 22 tabelas públicas e duas auxiliares privadas para todos os domínios solicitados; perfis, workspace inicial AG sem proprietário arbitrário, membros/papéis, CRM, proveniência, referências externas, campanhas, auditorias/IA permitidas, busca, jobs, consumo e eventos administrativos.
- Segurança: RLS em todas as tabelas, grants por coluna, helpers sem recursão, FKs compostas e deduplicação por workspace/Place ID; guardas de autoria/tenant/datas, histórico de etapas e updated_at automáticos. Funções privilegiadas privadas com search_path fixo; wrappers públicos invoker, execução restrita e auditoria sem conteúdo sensível.
- Operações protegidas: criação por allowlist privada, provisionamento inicial confiável, convites com hash/e-mail confirmado/expiração/revogação, papéis controlados, remoção de membros, transferência atômica de owner e reservas/liquidação idempotentes com locks. Nenhuma chave privilegiada foi usada em código comum da interface.
- Dados/licenças: CRM próprio separado de identificadores externos; política Google somente place_id, sem conteúdo/IA/exportação; aprovações e retenção para outros artefatos, nenhuma tabela de respostas brutas. Seed de desenvolvimento desativada por padrão e protegida por opt-in; não aplicada a projeto real.
- Tipos: `src/lib/supabase/database.types.ts` gerado por introspecção do catálogo PostgreSQL após executar as migrações; 22 tabelas, 9 funções e 8 enums. Gerador/conferência incluídos no check, sem saída manual fictícia ou alegação de geração oficial Supabase.
- Verificado: `supabase init` e CLI 2.122.0; aplicação desde banco vazio e seeds em PostgreSQL 18.6/PGlite 0.5.12; **68 cenários SQL aprovados**, incluindo usuários A/B em workspaces diferentes; `npm.cmd run check` passou lint, tipos, 22 testes unitários, testes SQL e build. Detalhes e matriz de permissões em `BANCO-DE-DADOS.md` e evidências em `VALIDACAO-BANCO.md`.
- Limitação confirmada: `npm.cmd run db:start` falhou por Docker/Podman ausentes. Runtime nativo Supabase não suporta este Windows. Não foram validados PostgreSQL 17 do config, stack completa, Auth/JWT real, Data API, corridas com múltiplas conexões ou tipos pelo CLI oficial. Não houve link, push de migrações ou alteração em Supabase remoto.
- Pendências reais: projeto/conexão autorizados para aplicar as migrações e provisionar um usuário real confirmado como owner; repetir validações na stack/major do destino, configurar execução periódica de retenção na etapa de jobs e integrar Auth/CRM à aplicação nas etapas solicitadas. Não é necessário fornecer segredos para executar os testes locais, e nenhum segredo deve ser enviado pelo chat.

### 27/10/2026 — Etapa 3: autenticação Supabase SSR

- Implementado: login e-mail/senha, cadastro fechado por padrão e habilitação explícita por configuração, confirmação de e-mail por ação explícita, recuperação/redefinição, callback PKCE, logout, perfil próprio, seleção de workspace e administração autorizada de membros/convites. Telas em português, tema AG, mobile-first e componentes interativos com estados pendentes/prevenção de envios repetidos.
- Proteção: clientes `@supabase/ssr` de navegador/servidor, Proxy Next 16 com cookies renovados, identidade verificada por `getUser`, autorização em cada ação, origem canônica/destinos enumerados, fetch/respostas sem cache compartilhado, cookies Secure em HTTPS. Metadata/cookie de seleção não são autorização. A demonstração permanece pública e identificada, sem gravação no banco.
- Banco: migração `005` adiciona índice de destinatário e RPCs de listagem/aceite pelo próprio e-mail confirmado; expiry, revogação, uso único, bloqueios e auditoria. Mantida proteção transacional contra remoção/rebaixamento do owner e UI de transferência com confirmação. Tipos regenerados: 22 tabelas, 11 funções e 8 enums.
- Convites: a chave `SUPABASE_SECRET_KEY` é opcional, isolada e usada somente para solicitar convite Auth após autorização. Sem ela, a UI informa que não enviou e-mail, oferece aceite para contas existentes e orienta convite administrativo para novas contas. Templates de e-mail locais versionados e configuração de hospedado documentada; nenhum e-mail real foi enviado.
- Verificado: instalação reproduzível com `npm.cmd ci --offline --cache .npm-cache --no-fund`; lint, tipos, **62 testes unitários**, **72 cenários SQL/RLS** e build aprovados. `npm.cmd run test:e2e`: **37 testes aprovados**, incluindo 16 Auth e regressão da interface existente. Capturas/overflow nas seis larguras e horizontal; inspeção visual de login em 1536 × 1024, 1366 × 768, 390 × 844 e 844 × 390, além de membros/redefinição mobile. Evidências/limites em `VALIDACAO-AUTH.md`.
- Instalação: primeira repetição de `npm ci` encontrou arquivo SWC bloqueado pelo servidor dev deste workspace; o processo foi parado para liberar o arquivo e a instalação terminou com sucesso. Aviso de manutenção do ESLint permanece registrado, sem atualização incompatível.
- Ambiente restaurado: servidor dev reiniciado na porta 3000, com HTTP 200 para login sem configuração e demonstração pública; perfil privado redireciona ao login (307). Nenhuma credencial real foi criada/preenchida.
- Documentado: `.env.example`, README, arquitetura, versões, `AUTENTICACAO.md`, templates/callbacks, separação de convites Auth/workspace e roteiro para ambiente real. `AGENTS.md` registra as decisões da etapa.
- Pendências reais: aplicar as cinco migrações em projeto Supabase autorizado; definir URL/chave publicável, Site URL/redirects, signup fechado, senha, confirmação e templates/e-mail; provisionar owner confirmado; configurar chave de convite somente se desejado. Validar login/logout/recuperação/convites e acesso entre duas contas reais na stack alvo, HTTPS/CDN, expiração/rotação e concorrência. Docker/Podman/credenciais não estão disponíveis; a fixture HTTP/PGlite não comprova GoTrue/PostgREST/SMTP reais. Teclado virtual e áreas seguras em dispositivo físico também permanecem pendentes. Segredos devem ser configurados no ambiente, nunca no chat.

### 27/10/2026 — Etapa 3A: contratos antes de dados reais

- Implementado: `docs/integracoes.md` com fontes oficiais abertas, data de consulta, diferenças EEA/não EEA, decisão do produto, limites por campo/finalidade, atribuições, fotos/avaliações, exportação/IA, configuração e restrições de chaves. Consulta complementar da documentação OpenAI com a skill OpenAI Docs; nenhum SDK novo ou serviço pago adicionado.
- Contratos: schemas/portas de busca, detalhes, auditoria, mensagem e persistência própria; ausência de campo/falha separadas de resultado negativo; paginação/valores limitados, totais e precisão geográfica explícitos, atribuições carregadas e rascunhos sempre revisáveis/sem envio. O view model antigo permanece exclusivamente demonstrativo.
- Política: `src/domain/integrations` centraliza teto por provedor e evidência vigente de cada campo/ação/finalidade/workspace. Copiar, derivar, importar ou transportar mantém ancestrais e o menor prazo autorizado; TTL/flag/chave não concede direitos. Flags do servidor fechadas por padrão, sem autoaprovação por usuário ou origem presumida de `user_input`.
- Adaptadores: catálogo próprio/licenciado com dados fornecidos explicitamente, separado da demonstração. Gateway verifica identidade/associação em cada operação e resolve dados/evidências por ID do servidor. Auditoria/IA reais retornam `not_implemented`; planos de mensagem/auditoria/persistência não fazem rede ou gravação. O repositório persistente de evidências/mapeamento SQL permanece para a conexão futura, sem reivindicar integração pronta em produção.
- Google: bloqueado no produto, inclusive novos IDs. Migração `006` substitui a prontidão `identifier_only` por blocked, protege por constraint/RLS e oculta referências legadas sem apagá-las. A fonte própria/licenciada continua elegível com comprovação independente e direitos suficientes. Tipos regenerados das seis migrações: 22 tabelas, 11 funções e 8 enums.
- Verificado: `npm.cmd run check` aprovou lint, conferência dos tipos SQL, TypeScript strict, **113 testes unitários**, **74 cenários SQL/RLS** e build. Testes novos cobrem cópia/derivação Google, flags, escopos de licenças, revogação, prazos, ciclos, fonte licenciada independente, payload indevido, associação revogada e atualização de banco legado. PGlite/PostgreSQL 18.6 continua sendo o ambiente SQL local; stack Supabase real/concorrência permanecem pendentes.
- Interface: somente avisos de fonte/permissão foram alinhados à política; composição/identidade preservadas. Testes de navegador em produção cobrem Auth/base/prospecção nas seis larguras e horizontal, com capturas adicionais da prospecção sem fonte e filtros abertos. As evidências ficam em `test-results/auth-autenticação-e-perfil-em-<dimensão>/prospeccao-sem-fonte.png` e nas capturas de configurações da suíte foundation; relatório em `playwright-report/index.html`. Esses arquivos são ignorados pelo Git.
- Regressão final: **37 testes de navegador aprovados** no Chromium/Playwright, com toque emulado. Prospecção sem fonte em 360 × 800, 390 × 844, 768 × 1024, 1024 × 768, 1366 × 768, 1536 × 1024 e 844 × 390; base/demonstração também em 1536 × 960 e 800 × 360. Inspeção visual de prospecção em 390 × 844 e 1366 × 768, e configurações mobile, sem cortes ou transbordamento observados.
- Correções na verificação: teste de adulteração de workspace passou a alterar o `FormData` enviado e conferir o UUID alheio no corpo da requisição; o método antigo de alterar input oculto podia ser reposto na hidratação e não exercitar o ataque. A migração 006 também foi testada com política Google legada já expirada, preservando o identificador em quarentena sem invalidar constraints.
- Pendências reais: fonte própria independente ou licença adequada com evidência revisada; armazenamento verificado do manifesto/ancestralidade, conexão dos adaptadores e quotas; revisão específica de contrato/conta Google se houver intenção de reconsiderar o bloqueio; aplicar seis migrações/validar no Supabase real; termos/privacidade públicos e atribuições para eventual Google, estratégia de egress/chaves e plano comercial Vercel antes de deploy. Nenhuma ativação de API, busca real, exportação, envio à IA, e-mail real ou contratação nesta etapa. Dispositivo físico/teclado virtual continuam sem validação.

### 28/10/2026 — Busca usando fontes permitidas

- Implementado o caminho operacional de catálogo próprio/licenciado de operador: arquivo privado no servidor, schema estrito de licenças/proveniência/localidades/empresas, releitura a cada operação e isolamento de workspace. Não há upload público, aprovação automática, importação de fixtures no runtime, payloads externos ou persistência de resultados.
- `POST /api/prospeccao` valida origem, corpo até 8 KiB, identidade por getUser, associação e permissões. Fonte/configuração ausente fica indisponível; não vira vazio nem demonstração. Proxy renova cookies na API; respostas são no-store. Contratos internos evoluíram para versão 2, preservando a política Google bloqueada e as seis migrações.
- Busca livre sem nicho, seis nichos em português com aliases da fonte e mapeamento técnico Google apenas documentado, palavra-chave com normalização, detalhes sob demanda e deduplicação pela referência da fonte. Não há chamadas Nearby/Text/Details ou resolução Google permitidas para este produto. Fontes oficiais e decisões revistas em [integracoes.md](integracoes.md).
- Seleção de cidade/região por registro autorizado do catálogo, associação municipal declarada/aproximada e raios 10/25/50 km com coordenadas aprovadas. Não há divisas municipais ou viés de localização disfarçados de restrição. Coordenadas ausentes são informadas como cobertura parcial; campos ausentes não viram “sem site”, score ou diagnóstico.
- Teto 20 itens/página, 3 páginas/60 resultados e até 1.000 empresas/fonte; cursor local vinculado a escopo/revisão. Limites de arquivo e concorrência, deadline do handler, cancelamento/descarte de resposta antiga e repetição limitada de falhas transitórias. Limitador de ações é por processo, **não** quota global Vercel. Não houve custo de API comercial.
- UI real separada da demonstração; indicador de fonte, carregados/filtrados/leads salvos no workspace/site informado, atribuições de empresas e localização, estados inicial/carregando/vazio/parcial/limite/erro e nova tentativa. Filtros expansíveis, cards mobile e drawer com Escape/foco. Buscar no celular abre Lista para não ocultar o retorno na aba Mapa; erro de permissão limpa dados anteriores.
- Verificado: `npm.cmd run check` aprovado com lint sem avisos, tipos do banco conferidos, TypeScript strict, **138 unitários/74 SQL/RLS** e build. `npm.cmd run test:e2e`: **47 cenários aprovados** (35,8 s no último run), preservando Auth/demonstração e acrescentando busca/segurança. Uma verificação móvel adicional confirmou foco e captura real do viewport. Sem reinstalação/atualização de dependências ou alteração SQL.
- Matriz de busca: **360 × 800, 390 × 844, 768 × 1024, 1024 × 768, 1366 × 768, 1536 × 1024, 800 × 360 e 844 × 390**, com três modos, raio, detalhes, paginação e filtro dos carregados. Capturas em `test-results/search-busca-e-detalhes-em-<dimensão>/`; inspeção visual de detalhes em 390/1366/1536 e viewport de busca 390. Página sem transbordamento global; tabela pode rolar internamente. Evidências, correções e limites em [VALIDACAO-BUSCA.md](VALIDACAO-BUSCA.md).
- Pendências: nenhuma fonte real aprovada foi disponibilizada, portanto **não houve consulta comercial real controlada**. Configurar `OWNED_CATALOG_FILE` com evidências vigentes e flags de busca/detalhes no servidor; provisionar Supabase real e verificar autenticação/RLS fora do harness. Google segue bloqueado por permissão, não só por chave ausente. Mapa real, fornecedor por rede, gestão de evidências no PostgreSQL, quotas distribuídas para APIs pagas, deploy e aparelho físico/teclado virtual continuam pendentes. Guia de configuração e escopo: [BUSCA-DE-EMPRESAS.md](BUSCA-DE-EMPRESAS.md). A etapa 4 tem implementação local da busca, sem declarar a integração real ou o mapa concluídos.

### 28/10/2026 — Sincronização de mapa, lista e detalhes

- AGENTS.md registra as novas regras de escopo, reutilização, validação direcionada e resumo de até cinco linhas. As execuções completas e a matriz ampla anteriores são evidência histórica, não exigência de repetição nesta etapa; a consolidação fica para o Prompt 13.
- Seleção única pela referência da fonte entre marcadores/membros de agrupamentos, linha/nome e cards, com destaque visual e o mesmo carregamento protegido de detalhes sob demanda. Alternar Mapa/Lista conserva seleção e filtros; filtrar uma empresa para fora limpa seleção/detalhes e cancela ações pendentes. Drawer no mobile mantém Escape e devolve foco ao acionador.
- Visualização local escura/dourada, carregada sob demanda, projeta apenas coordenadas aprovadas dos resultados filtrados, agrupa pontos e oferece controles de ampliação/restauração e seleção dos membros por botão. Não há tiles, ruas, divisas fictícias, varredura de consultas, SDK ou conteúdo Google. Campos sem informação continuam explícitos e registros sem coordenadas permanecem na lista. Atribuições da fonte e da localização aparecem no mapa.
- A ação externa `maps_link` revalida identidade, associação e permissão de transmissão das coordenadas no servidor. Só constrói URL Maps URLs com coordenadas próprias/licenciadas e `api=1`; não usa Place IDs, não faz consulta Google nem importa o conteúdo aberto. Sem `FEATURE_DATA_EXPORT`/licença escopada, a ação é recusada. Fonte oficial consultada somente para esta implementação necessária: [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started); decisão em [integracoes.md](integracoes.md).
- Anotações acessíveis no painel são **rascunhos locais**, por fonte/empresa, conservados entre seleções/abas e perdidos ao recarregar. **Adicionar lead real permanece indisponível:** o adaptador de persistência com retenção e ancestralidade não existe ainda. O botão e o motivo ficam visíveis; não há escrita via `user_input` para mascarar cópia nem marcação de salvamento fictício. Não foram implementados CRM completo, auditorias ou IA.
- Validação direcionada: `npm.cmd run typecheck` aprovado; ESLint somente nos arquivos alterados aprovado; `npx.cmd playwright test --config playwright.selection.config.ts` com **2 cenários aprovados** em Chromium/Next dev, **1366 × 768 e 390 × 844**, sem build de produção ou suíte completa. Reutiliza Auth HTTP/PGlite e catálogo sintético existentes; não conecta Supabase/Google reais. Os testes anteriores foram preservados integralmente.
- Os dois cenários verificaram detalhes não carregados antes da seleção, seleção pelo agrupamento e pela lista, destaque consistente, filtro comum com remoção da seleção, rascunho recuperado ao retornar à empresa, recusa de transmissão sem licença, lead indisponível, ausência de chamadas Google e de rolagem horizontal global. Capturas de viewport inspecionadas: `test-results/map-selection-seleção-sincronizada-em-<dimensão>/selecao-marcador.png` e `mapa-filtrado.png`.
- A configuração direcionada foi corrigida para substituir os servidores da configuração base, evitando inicialização duplicada; o teste passou a aguardar login/fonte e escolher um membro efetivamente agrupado. As execuções anteriores com falha não são aprovação. Next dev registrou `ECONNRESET` em cancelamentos de requisições durante Strict Mode; os dois fluxos foram concluídos. Não foi investigado framework/ambiente de produção nesta etapa; consolidação fica para o Prompt 13.
- Pendências concretas: Google Maps incorporado continua bloqueado pela política atual; catálogo real aprovado e stack Supabase real ainda não configurados/verificados. Persistência de leads/anotações precisa de adaptador e mapeamento seguro de evidências, retenção e deduplicação para o banco; não foi antecipada nesta etapa de seleção. A navegação externa autorizada só teve o caminho de recusa exercitado, sem abrir Google. Teclado virtual, dispositivos físicos, outras dimensões e regressão consolidada não foram testados novamente.

### 28/10/2026 — Auditoria de sites por ação do usuário

- Implementado adaptador PageSpeed Insights v5 e aba Auditoria nos detalhes, com mobile explícito por padrão e desktop por escolha. Solicitação por site/ação, sem lote ou disparo por abertura da tela, filtros ou mapa. Mostra notas presentes, recomendações limitadas, fonte e data; dados ausentes não viram zero e falhas não classificam site como ruim.
- Estados pendente, processando, concluída, inconclusiva e falhou. Reutilizados `async_jobs`, contadores e reservas. Migração **007** acrescenta somente duas tabelas privadas com RLS para metadados internos e hash de executor, mais um RPC invoker com implementação privada, search_path fixo, autenticação/associação/autoria e prova backend nas mutações. Sem chave Supabase privilegiada nas operações comuns.
- Execução aguardada na requisição, uma chamada PSI por tarefa, sem promises soltas/filas locais/tarefas após a resposta. Até uma tarefa processando por workspace e dez criações/dia, além da cota mensal administrativa existente. Reserva/debito de tentativa antes da chamada, idempotência e recuperação por outra instância. Lease vencido gera falha ao consultar/agir, sem repetir análise silenciosamente; pendente antigo expira e libera reserva ativa.
- Política atual **2026-10-28.1**: exibição PSI exige evidências específicas para `audit_metric` e `audit_recommendation`; a URL própria/licenciada exige exibição/transmissão para auditoria com ancestrais preservados. Relatórios/notas/recomendações não são persistidos, exportados ou enviados à IA. O banco guarda somente estado/IDs/metadados de execução. Reabrir uma tarefa concluída não refaz a análise nem recupera relatório não retido.
- URL resolvida no servidor por IDs; validação de endereço/DNS público, corpo limitado, rede somente ao host PSI fixo, chave em header, campos de resposta selecionados, limite de bytes e cancelamento. Destino retornado diferente é inconclusivo. Sem payload completo, screenshots, HTML, detalhes de recursos ou dados de campo persistidos/logados. A análise remota de redirects é comportamento do PSI, não controlado pela aplicação.
- Avaliação comercial **AG v1** separada de Lighthouse: oportunidade técnica a revisar somente com recomendação exibida e economia positiva estimada pela fonte; verificações disponíveis sem achados podem indicar ausência de oportunidade nesses critérios; ausência, erro ou evidência insuficiente não permitem classificação negativa. Sem scoring próprio, IA ou atualização automática do CRM.
- Verificações executadas somente na alteração: tipos regenerados por introspecção das sete migrações (**22 tabelas públicas, 12 funções, 8 enums**), `npm.cmd run typecheck` aprovado, ESLint nos módulos alterados aprovado e `npm.cmd test -- src/server/audits/audit.test.ts` com **2 casos aprovados**. Caso válido mobile com notas presentes/ausentes, recomendação, data, tarefa recuperada por outra instância e ausência de nova chamada em reenvio; falha 429 em desktop, com tarefa falhou e sem resultado/nota/classificação inventada ou payload retido.
- Testes reutilizam catálogo e harness SQL/Auth existentes, com resposta PSI e credenciais sintéticas. O RPC real foi exercitado sob role authenticated no PostgreSQL 18.6/PGlite; não equivale a Supabase Auth/PostgREST/PG17 hospedado. O teste existente de contagem de migrações foi ajustado para sete, sem excluir ou enfraquecer suas verificações. Não houve instalação, build, suíte completa, navegador, múltiplas resoluções, análise real, ativação de API ou contratação.
- Pendências reais: aplicar migração 007 no Supabase real, fonte/evidências aprovadas, `GOOGLE_PAGESPEED_API_KEY`, `AUDIT_EXECUTOR_SECRET` com hash privado e contador mensal configurados; confirmar header/seletor/duração em análise controlada real e hospedagem. Segurança negativa ampla, leases/concorrência, UI/SSRF completo e regressão consolidada ficam para Prompt 13. Guia, critérios e fontes oficiais consultadas apenas para implementar esta integração: [AUDITORIAS.md](AUDITORIAS.md). Não enviar segredos pelo chat.

### 30/10/2026 — Geração de mensagens comerciais

- Implementado somente o fluxo de mensagens nos detalhes da prospecção: tom Profissional/Consultivo/Direto, modelo autorizado, gerar/regenerar, editor, revisão explícita e copiar. Edições por fonte/empresa no estado da tela são compartilhadas entre painel e drawer, preservadas entre abas/seleções; não são reenviadas à IA nem salvas no CRM. Envios permanecem manuais. Recursos de auditoria, busca e CRM existentes foram reutilizados sem expandir seus escopos.
- SDK oficial OpenAI **7.45.1** instalado com versão exata e lockfile, compatível com Node 22/Zod 4. Responses API, `OPENAI_MODEL` obrigatório, segredo só no backend, Structured Outputs por `responses.parse`/`zodTextFormat` e schema estrito. A IA escolhe enums de composição; servidor monta frases controladas com nome e serviço permitidos. Sem frases factuais livres, problemas inventados, contatos anteriores, garantias, agentes, ferramentas, prompt livre ou framework extra. Variação limitada é intencional; regenerar pode repetir.
- Reutilizados contratos/gateway, getUser/associação/RLS e modelos `message_templates`. Vínculo opcional no manifesto privado exige corpo idêntico à descrição autorizada e ancestralidade preservada; `user_input` não comprova direitos. Envio à IA, exibição e cópia exigem evidências próprias por ação/finalidade, inclusive nos ancestrais. Google, PSI, demo, anotações, avaliações e histórico de contatos continuam excluídos do prompt. Identidade/evidências são revalidadas antes de executar, entregar e copiar; cópia usa prova curta por usuário/workspace/escopo.
- Migração **008** acrescenta hash privado do executor de IA e RPC invoker/definer com search_path fixo, sessão, associação e prova do backend; nenhuma chave Supabase privilegiada. Reutiliza tarefas, reservas e contadores: uma tentativa por ação, uma simultânea/workspace, 20/dia UTC e teto mensal administrativo. Débito antes da chamada, UUID idempotente, uma chamada aguardada/sem retry automático, timeout/lease. Interrupções são falhas recuperadas na próxima ação; sem execução após resposta, fila em memória ou resposta recuperável. Prompts, composições e rascunhos não são arquivados nem logados.
- Verificações reais desta alteração: instalação de um pacote direto; `npm.cmd run db:types` com oito migrações/22 tabelas públicas/13 funções/8 enums; `npm.cmd run typecheck` e ESLint direcionado aprovados. `npm.cmd test -- src/server/messages/message.test.ts`: **2 casos aprovados** com SDK real, fetch sintético e RPC SQL sob papel autenticado no harness PGlite. Válida verifica tom/payload mínimo/schema/sem chamada ao abrir/cota/estado/deduplicação em nova instância/cópia; falha 429 verifica normalização, ausência de vazamento, tarefa falha e sem retry. Nenhuma chamada paga, rede OpenAI ou Supabase hospedado. Primeiro Vitest bloqueado por EPERM no sandbox; os mesmos dois casos passaram com permissão de subprocesso. Testes anteriores preservados, contagem de migrações atualizada para oito.
- Não executados: suíte completa, build, navegadores/matriz responsiva, isolamento negativo amplo, concurrency/lease abrangentes, clipboard/teclado em aparelhos físicos e Supabase Auth/PostgREST real. Permanecem para Prompt 13. Nenhum segredo solicitado, API ativada, envio comercial, deploy ou contratação.
- Pendências reais: aplicar 008 no Supabase real; configurar `OPENAI_API_KEY`, `OPENAI_MODEL`, `MESSAGE_EXECUTOR_SECRET` e hash privado; provisionar contador mensal `ai_generation`; aprovar evidências de nome/descrição/saída OpenAI, vincular modelo existente e habilitar flags IA/exportação; revisar conta/modelo/retencão e limites de gasto. Não houve geração real verificada. Instalação, configuração, decisões e fontes oficiais consultadas com OpenAI Docs estão em [MENSAGENS-IA.md](MENSAGENS-IA.md).

### 30/10/2026 — CRM, acompanhamento e CSV restrito

- Implementado /leads e link Meus Leads na navegação existente. Lista desktop/cards mobile, Kanban de oito etapas com rolagem localizada e seletor acessível (sem depender de drag), filtros sobre registros carregados, detalhes em Sheet, responsável, etiquetas, próximo contato, Não contatar, notas persistentes e histórico automático. Próximo contato é limpo ao marcar Não contatar; nenhuma mensagem é enviada ou marcada como enviada por abrir link. Nenhuma suposição de WhatsApp foi acrescentada.
- Cadastro manual cria identificação interna e metadados comerciais; não declara nome empresarial/licença comprovados. Normalização no servidor e unicidade por workspace impedem repetição do mesmo rótulo. Notas/etiquetas/aliases permanecem internos, não são enviados à IA nem exportados automaticamente; dados e notas legados não são promovidos a próprios. Rascunhos da aba de prospecção continuam locais, sem migração silenciosa.
- Adicionar lead integrado à prospecção real por fonte: autenticação/associação, flags, direitos de identificador e ancestrais, prazo e política SQL de operador. Salva somente referência autorizada e metadados próprios, com identidade por workspace/fonte/ID, sem nome/site/telefone/avaliação ou respostas de APIs. Nome/categoria/site vêm da fonte sob permissão vigente em cada leitura, preservando atribuições. Repetir a adição retorna o lead existente e conserva metadados/Não contatar. Após eliminação obrigatória da referência não se promete deduplicação de identidade externa sem nova evidência.
- Migração 009 mantém 22 tabelas públicas/RLS e acrescenta duas auxiliares privadas com RLS para hash de executor e vínculos de fonte/ancestrais/retencão, FKs compostas, índices, etapas e campos do lead. RPC invoker/definer com search_path fixo, sessão/associação/prova do backend; nenhuma chave Supabase privilegiada. Referências gerenciadas são ocultas da Data API comum e nunca serializadas à UI. Limpeza SQL limitada ao prazo/política existe; agendamento real ainda precisa ser configurado pelo operador.
- CSV do CRM incluído somente por solicitação desta etapa: até 50 leads e allowlist de campos, créditos, contagens reais de registros/células omitidos, revalidação de direitos por campo/finalidade/ancestrais e flag de exportação. Identificações manuais, notas, etiquetas, perfis, IDs nativos, Google e conteúdo sem direitos não entram. UTF-8/BOM, delimitador pt-BR, escaping e neutralização de fórmulas inclusive após controles/espaços Unicode. Validação em planilhas/navegadores e negativos amplos não foi executada nesta etapa.
- Verificação restrita: npm.cmd run db:types (nove migrações; 22 tabelas públicas/14 funções/8 enums), typecheck e lint direcionado aprovados. npm.cmd test -- src/server/crm/crm.test.ts: 3 casos aprovados — adicionar fonte/manual e impedir duplicação, mudar para Em análise com histórico, persistir e recuperar anotação em nova instância. Harness SQL/Auth e fixtures existentes reutilizados; não equivale a Supabase Auth/PostgREST hospedado. Testes existentes preservados; somente contagem de migrações ajustada para nove. Sem instalação, pesquisa externa, chamada paga, suíte completa, build, navegador ou todas as resoluções.
- Pendências reais: aplicar 009 e validar na stack Supabase real; configurar CRM_EXECUTOR_SECRET/hash privado e flags, fonte/evidências/política SQL crmReferencePolicyId para vínculo de empresas e rotina de retenção, permissão de exportação por campo. Responsividade/teclado físico, negativos de autorização/concorrência e CSV em Excel/LibreOffice ficam para Prompt 13. Nenhuma fonte comercial, segredo real, agendamento, serviço pago, envio ou deploy foi configurado. Guia de implementação/operação/limites: [CRM.md](CRM.md).

### 30/10/2026 - Paginas do menu e gestao simples

- Implementados Dashboard com indicadores exatos do workspace e tarefas, Mapa de Oportunidades reutilizando filtros/mapa local, campanhas sem disparos, CRUD/copia autorizada de modelos, relatorios de funil/ganhos-perdas/consumo e configuracoes de perfil/workspace/membros/integracoes. Navegacao lateral e recolhivel agora possuem rotas para todos os itens; nenhuma tela exige API paga para mostrar sua interface/estado vazio.
- Indicadores contam registros reais do banco, com indisponivel em falha. Funil e ganhos/perdas sao etapas atuais, sem conversao historica ou faturamento inventados. Lateral/relatorios usam usage_counters do periodo UTC, unidades utilizadas/reservadas/limite e atualizacao explicita. Busca/exportacao ainda nao debitam todas as acoes nesses contadores, com limitacao visivel. Nenhum plano, pagamento ou notificacao artificial foi criado.
- Operacoes protegidas verificam getUser, associacao e papel atual, validacao estrita e RLS com sessao comum. Admin/owner gerenciam campanhas/modelos/workspace; tarefas seguem autoria/responsavel. Modelos copiam apenas corpo salvo identico ao vinculo aprovado no manifesto, com direitos atuais por campo/finalidade/ancestrais e creditos. Criar/editar nao aprova origem nem envia a IA. Google continua bloqueado.
- Migracao 010: triggers privados, search_path fixo e grants restritos para impedir planejamento/novo registro de contato com Nao contatar; ativar a preferencia remove apenas participacoes ainda planejadas. Contatos/respostas antigos sao preservados. Acao de contato exige confirmacao manual; abrir link nao registra envio e nenhum telefone e promovido a WhatsApp.
- Verificacao restrita: db:types por dez migracoes (22 tabelas publicas/14 funcoes/8 enums), typecheck e lint direcionado aprovados. npx.cmd playwright test --config=playwright.menu.config.ts: 1 caso aprovado no Chromium, com Auth/RLS HTTP e banco PGlite descartavel existentes. Cobriu navegacao dos oito itens, tarefa, criar/editar/excluir/copiar modelo autorizado, criar campanha/adicionar lead/registrar contato, relatorios/atualizacao, mapa por catalogo sintetico e alteracoes de workspace/perfil/acesso a membros. Um trecho desktop 1366x768 e menu/Relatorios mobile 390x844, com captura inspecionada e sem transbordamento global nesse trecho; nao equivale a matriz completa.
- Corrigidos rotulos dos controles e tipo do botao Cancelar observados/revisados durante o fluxo. Teste novo distingue status persistido de opcao homonima; assertivas antigas preservadas, contagem SQL atualizada para dez. Next dev registrou abort/ECONNRESET de requisicoes canceladas por navegacao rapida; nenhum erro de fluxo restante no caso final. Harness de teste estendido por allowlists, sem importacao no runtime ou afirmacao de Supabase real.
- Sem instalacao, pesquisa externa, teste individual por card/pagina, suite completa, multiplos navegadores, build, auditoria geral, chamada paga, API ativada, convite real, pagamento ou deploy. Pendencias: aplicar 010 e validar Supabase/contas/fontes reais, aprovar evidencias para copia, provisionar limites administrativos, retenção e consolidacao/negativos/concorrencia/teclado fisico no Prompt 13. Guia e captura: [PAGINAS-DO-MENU.md](PAGINAS-DO-MENU.md).

### 30/10/2026 - Revisao essencial de seguranca

- Corrigida uma falha reproduzida na validacao IPv6: o grupo vazio de 2001:: era convertido em NaN e podia escapar do bloqueio aplicado a representacao expandida. Agora equivale a zero, mantendo os bloqueios existentes. O backend continua sem proxy/fetch de sites arbitrarios; PSI usa endpoint fixo e DNS do alvo e validado sem consulta de teste real.
- Corrigida uma falha reproduzida no CSV: permissoes usavam a hora da leitura inicial, mesmo se uma licenca vencesse durante as esperas seguintes com manifesto inalterado. Autorizacao/revisao sao conferidas antes da montagem e os campos reavaliam hora atual, persistencia e prazo da referencia. Campo vencido e omitido; metadados proprios permitidos permanecem.
- Mantidos os controles atuais de sessao/getUser, RLS por workspace, modulos server-only, segredos em headers/backend, respostas privadas/no-store, cotas transacionais e tarefas duraveis com prova de executor/idempotencia/tentativa unica. Nao houve mudanca de biblioteca, SQL, lockfile, infraestrutura ou configuracao remota.
- Verificacao somente da correcao: npm.cmd test -- src/server/security/essential-regressions.test.ts. As duas falhas foram reproduzidas antes do ajuste; os dois casos passaram depois, com DNS/clock/dados sinteticos e sem APIs ou banco real. O caso CSV isola vencimento da licenca do nome com referencia ainda valida; o de IPv6 compara formas comprimida/expandida e conserva um endereco publico. ESLint aprovado somente nos tres arquivos tocados.
- Sem suite ampla, build, navegadores, varredura geral ou novos testes de paginas. Validacao consolidada e ambiente Supabase real continuam pendentes conforme Prompt 13; esta revisao nao certifica configuracoes externas nao acessadas.

### 30/10/2026 — Rodada consolidada, Prompt 13

- Inspecionados os testes existentes e reutilizado um conjunto de dez casos distintos: quatro serviços (inclusão/deduplicação e etapa de lead; falhas 429 PSI/IA), três SQL (SELECT A/B e UPDATE/DELETE indevidos) e três Chromium (login/acesso/logout; seleção sincronizada desktop/mobile). Nenhum caso equivalente novo, instalação, alteração de produto ou migração. Acrescentados somente seleção por `--grep` ao harness SQL e configuração Playwright que reúne casos existentes.
- Lint aprovado em uma execução; typecheck falhou no tipo da configuração nova, corrigido e aprovado na única repetição; build de produção aprovado uma vez. Serviços: quatro aprovados/três não selecionados; SQL: três aprovados/71 não selecionados, com dez migrações e RLS real no PostgreSQL 18.6/PGlite. Nenhuma chamada paga ou resposta de provedor real.
- Navegador inicial: Auth aprovado, dois casos de seleção falharam por exigir botão Adicionar lead desativado antes da etapa CRM. Atualizado para verificar recusa HTTP 503/not_configured, erro visível e ausência de confirmação/link de gravação no ambiente sem executor. Assertivas de seleção/filtros/foco/rascunho/Google preservadas. Somente os dois casos falhos foram repetidos, ambos aprovados; falhas iniciais e traces preservados em pasta separada.
- Capturas inspecionadas em um navegador, apenas 390 × 844 e 1366 × 768, com painel/drawer, mapa/filtros legíveis e sem transbordamento global nos pontos testados. Esta instrução substitui a matriz ampla histórica para o Prompt 13. Sem teclado físico/virtual real, outros viewports/navegadores, suíte completa, planilha CSV, concorrência ampla ou nova auditoria geral.
- Nenhuma falha restante no conjunto selecionado. Isolamento SQL local executado sob duas identidades não equivale à stack Supabase Auth/PostgREST/PG17; validação hospedada, provedores/configurações reais e deploy continuam pendentes. Relatório com comandos, falhas/correções, capturas e não executados: [VALIDACAO-CONSOLIDADA.md](VALIDACAO-CONSOLIDADA.md).

### 30/10/2026 — Preparação e publicação

- Usuário indicou `https://github.com/AndersonGehrkeDev/Ag-Captura-de-Leeds.git`. Conta e permissão de push confirmadas pelo Git Credential Manager/API sem exibir token; repositório público vazio encontrado, visibilidade preservada. Criado commit inicial `b8468f2` com o trabalho existente e destino origin configurado.
- Acrescentada CI com um job, Node/npm da base, instalação reproduzível, tipos/lint/build uma vez e os dez casos do Prompt 13, sem segredos reais/APIs pagas/migrações. Configuração Vercel usa Next.js, npm ci e build existente; nenhum módulo de runtime ou SQL alterado. Resultados locais do Prompt 13 reutilizados, sem repetir bateria/build antes do push.
- `.gitignore`/`.env.example` revisados; caminhos de credenciais, catálogos privados e artefatos confirmados ignorados, exemplo incluído com valores vazios/defaults. Scanner de publicação passou após exceção exata para a fixture sintética de rejeição de chave privilegiada; erro original era falso positivo, não uma credencial real. ESLint restrito ao scanner e sintaxe YAML/JSON conferidos, sem instalar biblioteca nova. A primeira tentativa do scanner foi bloqueada por EPERM de subprocesso no sandbox; executou com permissão apropriada.
- Acesso remoto restante: Vercel tem credencial salva, mas usuário/equipes/projetos retornaram HTTP 403. Supabase CLI informa token ausente e não há projeto vinculado. Browser host indisponível e solicitação do Chrome expirou; não foi possível reutilizar login por UI. Nenhuma chave/segredo solicitado no chat, plano contratado, banco resetado, migração aplicada, callback, restrição Google ou variável remota alterada.
- Preparação/manual indispensável, variáveis por ambiente, origem/callbacks, migrações somente pendentes, restrições Google sem liberar produto, compatibilidade condicional das tarefas de 60 s com Pro/Fluid compute, conferência curta pós-deploy e rollback documentados em [PUBLICACAO.md](PUBLICACAO.md). Deploy/URLs Vercel e os três testes remotos continuam pendentes até liberar conta/projeto/configuração. Resultado do push/CI será registrado abaixo após verificação.
