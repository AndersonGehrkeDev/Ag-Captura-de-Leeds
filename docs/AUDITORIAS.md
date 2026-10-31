# Auditorias de sites — 28/10/2026

## Fluxo implementado

A aba **Auditoria** nos detalhes de uma empresa do catálogo autorizado oferece mobile por padrão e desktop por escolha explícita. Site não informado não prova ausência de site e não permite disparar a análise. Abrir a aba ou selecionar o dispositivo consulta somente metadados da tarefa; não chama PageSpeed. Não há análise de todos os resultados nem execução pela movimentação do mapa.

Um clique cria uma tarefa durável e solicita sua execução em uma segunda requisição aguardada. A UI mostra pendente, processando, concluída, inconclusiva ou falhou. Notas de desempenho, acessibilidade, boas práticas e SEO são mostradas somente quando presentes, além de até cinco recomendações e da data de medição fornecida. Ausência é “Não disponível”, nunca zero. Zero explícito é preservado. Dados de laboratório e a avaliação comercial são identificados separadamente.

O adaptador usa PageSpeed Insights **v5**, GET no host fixo `pagespeedonline.googleapis.com`, `strategy=mobile|desktop`, `locale=pt-BR`, quatro categorias e seleção parcial de campos. A chave vai no header `X-Goog-Api-Key`, sem chave na URL. O pedido exclui screenshots, HTML, descrições longas, detalhes de recursos e dados de campo. Só são lidos metadados de notas/audits necessários, com limite de 1 MiB e prazo de 40 s; não existe fallback para uma resposta completa se o seletor falhar. Não se faz nova chamada por falha automaticamente.

O servidor valida origem da requisição, JSON de até 4 KiB, identidade via getUser, associação ao workspace e IDs. Resolve a URL no registro privado de operador, sem aceitar URL, licença ou permissão declaradas pelo navegador. Só são aceitas URLs públicas HTTP(S), sem IP literal, credenciais, query, fragmento ou porta não padrão. Verifica DNS e recusa resultados privados/reservados e nomes locais. Não há proxy que faça fetch de um site arbitrário no backend: a chamada de rede da análise é exclusivamente ao endpoint fixo PSI, com redirects HTTP do endpoint proibidos. O serviço PSI pode seguir redirects do site remotamente; a aplicação não controla isso. Resposta de destino/origem diferente é tratada como inconclusiva, sem notas ou recomendações usadas para a avaliação.

## Direitos de dados

As decisões anteriores foram preservadas. Para a URL, o registro próprio/licenciado precisa autorizar `display` e `export` para `website_audit` em todos os ancestrais. Flags não são licença. Conteúdo Google Places/Maps continua bloqueado e não pode ser copiado para passar nessa validação.

Para a saída, o manifesto privado exige licença/evidência de servidor com:

- `provider: pagespeed`, `sourceReference: pagespeed-insights-v5`;
- finalidade `website_audit`;
- campos `audit_metric` e `audit_recommendation`;
- ação `display`, aprovação real, vigência, ausência de revogação e atribuições aplicáveis.

Não há autoaprovação por formulário/API. Usar a chave PSI não estabelece essa permissão. As verificações ocorrem ao criar, executar e antes de exibir o relatório, incluindo a ancestralidade da URL. A revisão de evidências precisa abranger essa exibição e interpretação limitada, sem presumir direitos de arquivo, exportação ou IA. Fonte e data aparecem no relatório; valores e recomendações não são gravados no banco, logs, cache ou localStorage.

## Tarefas duráveis e hospedagem

Reutiliza `public.async_jobs`, `usage_counters` e `usage_reservations`. A migração **007** adiciona `private.audit_requests` (IDs internos da fonte/proveniência, estratégia e desfecho) e `private.audit_executor_config` (somente SHA-256 de segredo). Essas tabelas têm RLS, nenhum grant direto ao cliente e não são expostas na Data API. A fachada pública `ag_audit_task` é invoker; a implementação elevada é privada, com search_path fixo, execução restrita, associação e autoria verificadas. Não recebe corpo/nota/resposta PSI, URL ou licença como prova de autorização.

Enfileirar, assumir e concluir exigem sessão do usuário e prova do executor backend. A leitura de estado exige associação atual e retorna somente tarefa do próprio usuário. Não há chave Supabase privilegiada nas operações comuns. A mutação é serializada no workspace por transação curta; o banco não fica com lock durante a chamada de rede.

Limites: **uma auditoria processando por workspace**, até **10 tarefas novas/dia/workspace**, uma chamada por tarefa (`max_attempts=1`) e contador mensal configurado administrativamente. A criação reserva uma unidade; assumir a tarefa debita uma tentativa antes da chamada. Essa unidade é orçamento interno de tentativas, **não cobrança confirmada do Google**, e pode ser consumida mesmo em falha/interrupção. Repetir a mesma chave de criação não duplica tarefa; reexecutar tarefa iniciada/encerrada não chama PSI novamente. Nova tentativa exige ação explícita, nova chave e cota disponível.

O handler tem `maxDuration=60` e sinal de cancelamento em 50 s; o cliente aguarda até 55 s. O tempo efetivo também depende de Auth, banco, rede e plano/ambiente Vercel, ainda não validados. A execução é aguardada antes da resposta, sem serviço pago adicional, Cron, `after`, `waitUntil`, worker em memória ou promessa solta. Se a função morrer, o estado permanece no banco. Uma tarefa em execução com lease de 90 s vencido passa a falhou na próxima leitura/ação autorizada, sem repetição automática. Uma tarefa não iniciada com mais de 5 min é encerrada na próxima consulta/ação dessa tarefa e libera reserva ainda ativa. Reabrir a aba só consulta estado; tarefa pendente exige ação para continuar.

Isso oferece estado e recuperação duráveis, **não execução autônoma contínua de uma fila**. Não depende de manter o navegador aberto para guardar o estado, mas o relatório não retido pode ser perdido se a resposta não chegar. Uma tarefa concluída reaberta informa que o relatório não foi armazenado; refazer exige nova análise explícita, sujeita a cota. Não salvar temporariamente o JSON para contornar a política de dados.

## Configuração pendente no ambiente real

1. Aplicar as sete migrações e provisionar Supabase/Auth, workspace e usuário reais, conforme as etapas anteriores. Sem configuração de banco não há tarefa durável.
2. Configurar `GOOGLE_PAGESPEED_API_KEY`, restrita à API necessária, com cotas no projeto, e revisar egress/restrições adequadas ao servidor. Não expor ao cliente nem registrar headers.
3. Configurar `FEATURE_WEBSITE_AUDIT=true`, `FEATURE_DATA_EXPORT=true` e `OWNED_CATALOG_FILE` com evidência vigente para URL e saída descritas acima. Não usar as licenças sintéticas de testes como permissão real.
4. Gerar um segredo aleatório de **32 bytes em hexadecimal**, guardar apenas no ambiente backend como `AUDIT_EXECUTOR_SECRET` e provisionar seu SHA-256 na tabela privada pelo operador. Não enviar segredo pelo chat, Git, URL ou logs. O exemplo abaixo usa somente placeholder de hash; substituir por hash local válido, nunca pelo segredo original:

```sql
-- Operador administrativo; hash de 64 caracteres, não o segredo do executor.
insert into private.audit_executor_config(singleton,secret_sha256)
values (true,'<SHA256_DO_SEGREDO_EM_HEXADECIMAL>')
on conflict (singleton) do update set secret_sha256=excluded.secret_sha256;
```

5. Provisionar um contador `website_audit` para o workspace e mês vigente, com limite decidido pelo responsável; a aplicação não inventa plano nem concede cotas. Usar `usage_counters` conforme [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md). Não habilitar logging de corpos/argumentos do RPC, pois a prova do executor é uma credencial. Não habilitar captura de respostas PSI em APM.
6. Conferir que a hospedagem suporta a duração configurada no plano comercial apropriado. Não houve deploy, contratação, ativação de API ou mudança de plano.

## Regra comercial simples — AG v1

A nota Lighthouse é mostrada como nota da fonte e **não entra numa pontuação comercial própria**. A classificação não altera o status geral da empresa no CRM.

- **Oportunidade técnica a revisar:** análise utilizável com data e alguma nota disponível; pelo menos uma recomendação exibida tem score numérico inferior a 1 e economia de carregamento estritamente positiva informada pelo PSI. Exibir os IDs dessas evidências. Não é promessa de conversão/vendas nem diagnóstico definitivo; confirmar impacto e escopo com o cliente.
- **Nenhuma oportunidade identificada nos critérios desta execução:** houve análise utilizável e verificações avaliadas, sem recomendação selecionada. Não significa que o site esteja perfeito ou dispense outros serviços.
- **Evidências insuficientes:** erro de runtime, destino diferente, data/notas ausentes ou recomendações sem economia quantificada suficiente. Não rotular o site como ruim. Falha HTTP não produz relatório nem avaliação comercial.

As recomendações exibidas são no máximo cinco verificações numéricas/binárias não atendidas, ordenadas pela economia estimada disponível. Texto é renderizado sem HTML/links ativos; ausência de recomendação na resposta não é “problema inexistente”. Não há IA, scoring complexo ou atualização automática de leads.

## Verificação desta etapa

- `npm.cmd run db:types`: sete migrações aplicadas no banco descartável e tipos gerados por introspecção: 22 tabelas públicas, 12 funções e 8 enums.
- `npm.cmd run typecheck`: aprovado. ESLint somente nos arquivos alterados: aprovado.
- `npm.cmd test -- src/server/audits/audit.test.ts`: **2 casos aprovados**, sem chamadas externas: resposta mobile válida com nota zero explícita/nota ausente, recomendações, data, recuperação por outra instância e execução única; falha 429 em desktop explícito, com estado falhou e ausência de payload/nota/classificação fictícia.

Os testes reutilizam fixtures de catálogo e o harness SQL/Auth; as credenciais e o corpo PSI são sintéticos. Exercitam o RPC real das sete migrações em PostgreSQL 18.6/PGlite, não Supabase Auth/PostgREST/PG17 hospedado. O teste antigo de contagem de migrações foi atualizado de seis para sete, sem remover verificações. Não foram rodadas suíte completa, build, testes de navegador ou todas as resoluções. Permissões negativas amplas, crash/lease concorrente, DNS/SSRF completo, UI e fluxo real PSI/header/seletor de campos ficam pendentes para a validação consolidada e ambiente configurado. Nenhuma análise comercial real foi feita.

## Fontes oficiais consultadas em 28/10/2026

- [PSI runPagespeed](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed): categorias, estratégias, estrutura e sugestões. O default da API é desktop; o aplicativo envia **mobile explicitamente**.
- [Discovery oficial PSI v5](https://www.googleapis.com/discovery/v1/apis/pagespeedonline/v5/rest): endpoint e parâmetro `fields` para resposta parcial. A sintaxe de seleção segue a [documentação Google de respostas parciais](https://developers.google.com/workspace/gmail/api/guides/performance); o seletor específico ainda precisa de consulta controlada real, sem fallback automático a payload completo.
- [Uso de API keys](https://docs.cloud.google.com/docs/authentication/api-keys-use): header em vez de chave na URL. O suporte operacional do projeto PSI será conferido na conexão controlada.
- [Get started PSI](https://developers.google.com/speed/docs/insights/v5/get-started): medições/sugestões e mudança planejada nos dados de campo; nenhuma API CrUX adicional foi conectada.
- [Duração de Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration): `maxDuration` depende da configuração/plano. Nenhuma fila/Workflow pago foi adicionado.

As fontes técnicas não revogam as decisões de direitos de [integracoes.md](integracoes.md). Não se presumiu licença para armazenar, exportar ou enviar relatório à IA.
