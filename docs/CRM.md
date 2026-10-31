# CRM — implementação em 30/10/2026

CRM disponível em `/leads`, no menu **Meus Leads**, e integrado ao botão **Adicionar lead** da prospecção por fonte autorizada. Código implementado e verificado localmente; Supabase real e fonte comercial continuam sem configuração/validação. Sem novos pacotes, serviços pagos ou módulos de campanha/envio.

## Operação

- Lista com tabela no desktop e cards no celular; Kanban com rolagem horizontal somente no quadro, controles de rolagem e seletor de etapa por card. Não depende de arrastar ou hover. Abas reutilizam Radix; detalhes reutilizam Sheet, com Escape e devolução de foco. Campos e controles principais têm área de toque de 44 px ou mais; teclado virtual/dispositivo físico ainda não foram verificados nesta etapa.
- Etapas: **Novo**, **Em análise**, **Contato iniciado**, **Qualificado**, **Proposta enviada**, **Negociação**, **Ganho** e **Perdido**. IDs anteriores foram preservados; `analysis` e `negotiation` foram adicionados ao enum SQL, sem reescrever históricos. A ordenação da apresentação é explícita, não depende da ordem histórica do enum.
- Responsável validado entre membros do mesmo workspace, até 12 etiquetas de 30 caracteres, anotações originais de até 4.000 caracteres e próximo contato com data/hora local do dispositivo. Backend recebe ISO e PostgreSQL guarda timestamptz. **Não contatar** fica destacado e limpa o agendamento do próximo contato, com constraint também no banco. Não há lembrete automático ou envio.
- Alterações usam a versão `updated_at` para recusar gravação que sobrescreveria um registro modificado. O trigger existente grava etapa anterior/nova, autor e data no histórico. Detalhes mostram até 50 notas e 50 mudanças recentes, indicando esse escopo. Novas notas têm UUID de operação, preservado em tentativa sem confirmação, para impedir repetição acidental.
- Lista carrega 50 registros por página, até 10.000 por sessão. Busca e filtro de etapa atuam **nos registros carregados**; contagens do Kanban têm o mesmo escopo. Seleção/filtros são conservados ao alternar Lista/Kanban. CSV permite até 50 leads por ação. Perfis de até 500 membros são carregados; ID atribuído fora dessa projeção não é apresentado como “não atribuído”.

Não existem botões que presumam WhatsApp a partir de telefone. Abrir um link não registra envio ou contato. “Contato iniciado” só muda por ação explícita na etapa; a plataforma não afirma que uma mensagem foi enviada. Preferência Não contatar não controla aplicativos externos nem constitui um mecanismo de disparo. Futuras integrações de envio precisarão verificá-la por lead no servidor; envio comercial continua fora do produto atual.

Atualização da gestão de menu: a migração 010 aplica Não contatar também às campanhas, recusando novo planejamento/registro de contato e removendo vínculos ainda planejados quando a preferência é ativada. Contatos e respostas históricos não são apagados. Ações e limites estão em [PAGINAS-DO-MENU.md](PAGINAS-DO-MENU.md).

## Cadastro manual e origem

O formulário manual cria uma **identificação interna** para organização da carteira, com responsável, etapa e demais metadados. Esse rótulo não é anunciado como nome empresarial verificado. Não há campos livres de telefone, site, endereço ou avaliações que convertam conteúdo de um provedor em dados próprios. Para associar uma empresa de uma fonte, use a ação da prospecção com evidência vigente.

`user_input` no histórico de proveniência registra o canal de entrada. `crm_authored` em notas registra criação por este fluxo autenticado. **Nenhum dos dois comprova licença ou origem independente.** As anotações e etiquetas são registros comerciais internos do usuário, não um canal para arquivar respostas externas; a interface orienta a não colar conteúdo restrito. Esses textos e identificações manuais não são exportados nem enviados à IA automaticamente. A UI não atribui `first_party` a uma cópia manual de Google. Notas antigas e dados legados são preservados no banco; a nova tela não os promove automaticamente a dados verificados. Notas antigas sem marca do novo fluxo não entram na lista de notas dessa tela.

Deduplicação manual normaliza NFKC no servidor, espaços, caixa e acentos comuns de português, com índice único por workspace. Repetir o cadastro retorna o lead existente e não sobrescreve etapa, responsável ou Não contatar. Isso deduplica **identificações internas**; não inventa identidade jurídica entre nomes semelhantes.

## Adicionar pela prospecção

O navegador envia somente workspace, fonte e referência. Backend verifica `getUser`, associação atual, flags, fonte própria/licenciada, tipo do campo, árvore completa de proveniência e direitos atuais. Google, PageSpeed e demo não entram nesse caminho. DTOs não aceitam licença, política SQL, origem alegada, nome ou payload externo para se autorizar.

O contrato é deliberadamente mínimo:

1. Retém apenas a referência permitida, fonte, IDs de proveniência/ancestrais, data de observação da fonte e menor prazo de retenção calculado pela política. Não solicita nem copia nome, site, telefone, foto, avaliação ou resposta completa para `leads`.
2. `leads` recebe identificação neutra gerada pelo sistema e metadados comerciais próprios. `lead_external_references` conserva um token de referência delimitado por fonte (`crm1:<sourceId>:<sha256 do ID nativo>`), não um Place ID nem conteúdo de API. O ID nativo e vínculo ao lead ficam em `private.crm_source_bindings`, com FKs compostas para impedir associação entre workspaces/leads distintos. Hash também é derivado da fonte e segue sua retenção; não é uma autorização para reter indefinidamente.
3. Cada leitura resolve nome, categoria e site no catálogo privado atual, apenas com direito de exibição **CRM** por campo e ancestral. Falta de fonte, licença, ancestral ou correspondência não destrói os metadados do CRM: mostra identificação interna e indisponibilidade. Créditos de licença e atribuições do registro acompanham os campos; se não for possível conservar os créditos dentro dos limites, os campos são suprimidos.
4. Referências gerenciadas ficam **ocultas no SELECT comum da Data API**, mesmo para membros. O RPC autenticado exige também prova do backend para recuperar vínculos, e o serviço não os serializa para o navegador. Não usa chave Supabase privilegiada. Legados não são usados como prova de origem.
5. Unicidade transacional por `(workspace, fonte, referência nativa)` impede duplicação mesmo com concorrência e instâncias diferentes. Repetir adição devolve o mesmo lead, atualizando somente o vínculo com evidência atual; não reinicia a retenção sem uma observação/licença que a permita e não sobrescreve metadados ou Não contatar. Não há deduplicação especulativa entre fontes independentes sem identificador comum autorizado.

Após apagar uma referência por obrigação de retenção, não mantemos um identificador oculto para reconstituí-la. Por isso não prometemos deduplicação da identidade externa **após sua eliminação**; o registro comercial interno permanece, e uma nova associação exige revisão de origem. Não se deve prolongar a retenção para contornar essa limitação.

Rascunhos da aba Anotações da prospecção continuam locais. Nenhuma cópia silenciosa desses rascunhos para notas persistentes foi adicionada. O link **Abrir lead no CRM** permite acompanhar o registro e escrever uma anotação original.

## Evidências e configuração de fonte

O campo opcional `crmReferencePolicyId` em cada fonte do manifesto privado aponta para uma política SQL revisada por operador. Não é recebido por API de usuário. As duas evidências precisam existir:

- Manifesto: licença do identificador/ancestrais, ação `persist` e `display` para finalidade `crm`, retenção explícita e válida. Âncora da fonte também exige exibição `prospecting`. Data/prazo vêm das observações/licenças originais, não da cópia ao CRM. Cada campo exibido depois exige sua própria permissão `display` CRM; exportar exige `export` CRM.
- `data_usage_policies`: ID no workspace correto, `source=first_party` ou `authorized_import` conforme a fonte, `purpose=prospecting`, `persistence=identifier_only`, `allowed_fields` contendo `external_id`, `reviewed_by` não nulo e aprovação/validade vigentes. O prazo recebido precisa caber na validade dessa política SQL. Essa política cobre somente a referência; não libera conteúdo, exportação/IA ou Google.

Operador precisa de evidência real e independente para aprovar o manifesto e a política; preencher esses registros não produz direitos. O catálogo e suas aprovações não vão para Git, `public` ou logs. IDs de proveniência devem identificar registros imutáveis e conservar ancestrais; falta/mudança da árvore impede uso do vínculo existente.

## Retenção

`private.ag_crm_purge_expired(p_batch integer default 100, p_workspace uuid default null)` remove até 500 referências vencidas ou cuja política SQL foi bloqueada/venceu, sem apagar notas, etapas ou outros metadados do lead. Tabelas e função ficam fora da Data API; apenas o operador pode executar diretamente. Toda ação do RPC CRM limpa um lote de até 100 do workspace autorizado. Leituras não exibem conteúdo de referência vencida que ainda esteja aguardando limpeza.

**A limpeza sob demanda não é agendamento.** Antes de ativar fonte real com retenção, configurar o executor administrativo de manutenção já adotado para chamar o purger em frequência e lotes compatíveis com os prazos, sem depender de visitas à interface. Esse agendamento não foi provisionado nem verificado; não há promessas em memória, cron pago ou infraestrutura nova. Revogação exige atualizar manifesto **e** política SQL correspondente e executar a limpeza imediatamente, repetindo lotes até concluir. O serviço nega exibição/exportação quando o manifesto foi revogado, mas isso não substitui eliminação física quando exigida.

## CSV autorizado

O endpoint permite escolher somente: ID próprio do lead, nome/categoria/site autorizados da fonte, etapa, responsável **por ID**, próximo contato ISO e Não contatar. Campos estruturados da operação comercial são dados do CRM, sem conteúdo externo. Identificação manual, etiquetas, anotações, nomes de perfis, referências nativas, legados não comprovados e Google não entram no CSV. Isso evita transformar texto livre ou canal `user_input` em origem comprovada.

Campos de fonte precisam de permissão atual `display` **e** `export` para `crm` em todos os ancestrais, além do vínculo ainda persistível. Revalidam-se associação, revisão do catálogo e permissões ao exportar. Células ausentes ou sem direito ficam vazias, com contagem informada; registros inacessíveis não entram e a resposta informa a quantidade efetivamente exportada. Créditos obrigatórios ficam em coluna própria. Máximo de 50 leads por ação e arquivo de 400.000 bytes; não há exportação automática de toda a carteira ou todos os resultados de busca.

Correção essencial de 30/10/2026: o relógio das permissões e o prazo da referência são reavaliados depois da última espera de autenticação/leitura do manifesto, antes de montar os campos do CSV. Revisão/hash do arquivo inalterada não conserva uma licença que venceu durante a operação; o campo fica vazio, enquanto metadados próprios autorizados continuam exportáveis.

CSV usa UTF-8 com BOM, `;`, CRLF, aspas em todas as células e duplicação das aspas internas. Prefixa apóstrofo quando o conteúdo pode começar uma fórmula com `=`, `+`, `-`, `@` ou equivalentes de largura inteira, inclusive após espaços, caracteres de controle ou formatação Unicode. Tabs/CR/LF iniciais também são neutralizados; NUL é removido. Não confundir apenas colocar aspas com proteção contra fórmulas. Testes em Excel/LibreOffice e negativos amplos ficam para o Prompt 13; não foram declarados aprovados nesta etapa.

## Segurança e configuração pendente

`POST /api/crm`: same-origin, JSON de até 16 KiB, schemas estritos, prazos de 20 s/cliente 25 s, resposta privada/no-store e refresh de cookies pelo Proxy. `getUser` e associação atual são verificados; RPC invoker/implementação privada definer com `search_path=''` verifica também sessão, workspace, autoria de nota, responsável e prova de backend. RLS e grants existentes permanecem. Não há cliente privilegiado nem aceitar `workspace_id` arbitrário para modificar registros de outro contexto. Erros não retornam SQL, caminhos de arquivo, segredo ou payload.

1. Aplicar migrações **001–009** no Supabase real e validar Auth/RLS/PostgREST com usuários reais. Não expor schema `private`.
2. Configurar **CRM_EXECUTOR_SECRET** no servidor (`.env.local` ignorado/Vercel), 32 bytes aleatórios em 64 caracteres hexadecimais. Cadastrar apenas seu SHA-256 em `private.crm_executor_config(singleton, secret_sha256)` por canal administrativo confiável. Nunca enviar segredo pelo chat, versionar chave ou habilitar logs de argumentos RPC/corpos sensíveis.
3. Habilitar `FEATURE_OWN_DATA_PERSISTENCE=true` para gravar metadados/notas e referências. Cadastro manual e CRM interno independem de Google, OpenAI, PSI ou catálogo externo. Listar exige banco/execução configurados; gerar dados de demonstração nunca é fallback.
4. Para adicionar fonte: configurar `OWNED_CATALOG_FILE`, suas evidências e `crmReferencePolicyId`, política SQL aprovada, flags de catálogo para a prospecção e rotina de retenção. Para exportar: `FEATURE_DATA_EXPORT=true` mais direitos por campo/finalidade. Configuração não comprova conexão/licença.

Nenhuma configuração remota, segredo real, fonte comercial, rotina programada, API externa ou deploy foi criado nesta etapa.

## Verificação restrita executada

- `npm.cmd run db:types`: nove migrações executadas no harness PGlite, tipos gerados por introspecção — **22 tabelas públicas, 14 funções, 8 enums**. Nenhuma edição manual de tipos.
- `npm.cmd test -- src/server/crm/crm.test.ts`: **3 casos aprovados**, somente os fluxos pedidos. Adição por referência aprovada e manual, repetição sem duplicação e sem copiar conteúdo; mudança para Em análise com responsável/etiquetas e histórico automático; anotação escrita no banco e recuperada por outra instância do serviço. Reutiliza `tests/fixtures/integration-catalog.ts`, migrações e seed sintética descartável. Papel autenticado é simulado no PostgreSQL; identidade do gateway é fixture, não Supabase Auth real.
- `npm.cmd run typecheck` e ESLint somente nos módulos tocados aprovados. Testes anteriores preservados; contagem de migrações do harness atualizada de oito para nove.

Sem instalação, pesquisa externa, chamadas pagas, suíte completa, build, navegador ou matriz responsiva. CSV, isolamento negativo amplo/concorrência, Não contatar em fluxos futuros de envio, prazos/agendamento e experiência em dispositivos físicos permanecem para consolidação/configuração real conforme Prompt 13. Não afirmar que Supabase/GitHub/Vercel estejam conectados por existir este código.
