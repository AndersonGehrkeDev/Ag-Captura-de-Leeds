# Mensagens comerciais — implementação em 30/10/2026

Código pronto para configuração, sem conexão OpenAI ou Supabase real verificada. Somente geração de rascunhos; nenhum envio comercial, agente, ferramenta, framework, pesquisa web, disparo ou campanha foi acrescentado. A demonstração pública mantém seus exemplos sintéticos separados.

## Fluxo e composição

Na aba **Mensagem IA** dos detalhes da empresa, escolha tom Profissional, Consultivo ou Direto e um modelo autorizado. Abrir a aba consulta apenas opções no servidor; não chama OpenAI. Gerar e regenerar exigem clique e consomem uma tentativa cada. O editor permite até 2.000 caracteres, revisão explícita e cópia manual. Editar não reenvia o texto à IA. Rascunhos/edições ficam no estado da tela, compartilhado entre painel desktop e drawer e conservado entre abas/seleções; sair ou recarregar perde esse estado. Não há localStorage nem gravação no CRM.

A Responses API escolhe uma **composição estruturada** (`greeting`, `introduction`, `closing`, cada um um enum fechado). O SDK valida com `zodTextFormat`/`responses.parse`, e o servidor valida novamente. A mensagem final combina essas escolhas, frases em português revisadas no código, nome autorizado e descrição aprovada do serviço. O modelo não fornece frases factuais livres. Isso limita a variação deliberadamente: não diagnostica o site, não afirma falta de site, não inventa contato anterior, métricas ou garantia de resultado. Os três tons usam frases distintas. O operador precisa revisar a descrição do serviço para que contenha somente uma oferta verdadeira, sem diagnósticos de terceiros nem garantias. Há rejeição adicional de padrões de garantia/contato anterior, mas esse filtro não substitui revisão humana.

Saídas incompletas, recusas, JSON incompatível e erros são falhas sem novo rascunho. Nenhum fallback sintético é usado. Uma regeneração pode repetir a composição; diversidade não é garantida. `reviewRequired: true` e `sent: false` são impostos pelo servidor. Notas, auditorias PSI, avaliações, contatos, histórico comercial, URL do site e referência externa não entram no prompt. Só nome da empresa, descrição de serviço e tom são transmitidos, além das instruções e schema fixos.

## Evidências e reutilização dos modelos

O fluxo usa `message_templates`, sessão SSR/getUser, associação atual, RLS, contratos `MessageGenerationPort`/`messageDraftSchema`, preparação de mensagem do gateway e `authorizeData` existentes. Um registro legado `source=user_input` **não** comprova origem nem autoriza envio à IA. Modelos sem evidência são omitidos, sem serem apagados ou alterados automaticamente.

O manifesto privado de `OWNED_CATALOG_FILE` aceita, em cada workspace, o campo opcional e retrocompatível `messageTemplates`:

```json
{
  "messageTemplates": [
    {
      "templateId": "UUID_DO_MODELO_EXISTENTE_NO_WORKSPACE",
      "body": {
        "provenanceId": "UUID_DA_DESCRICAO_COM_PROVENIENCIA",
        "value": "DESCRICAO_VERDADEIRA_E_APROVADA_DO_SERVICO"
      }
    }
  ]
}
```

Esse trecho é ilustrativo, não um manifesto completo válido. IDs/valores devem corresponder a registros reais aprovados pelo operador. `body.value` precisa ser **idêntico** ao `message_templates.body` ativo desse workspace, em uma linha de até 500 caracteres. Nesta etapa o corpo autorizado é uma descrição de serviço, não um prompt livre nem um template com substituições executáveis. O modelo original não é sobrescrito. Os nomes exibidos são rótulos internos numerados para evitar transmitir nomes arbitrários de modelos. A descrição não ganha origem própria pela cópia para SQL.

Pré-condições verificadas no servidor:

- Fonte `first_party` ou `licensed`, associação com workspace e permissão de exibição para prospecção; campo da empresa `name` com proveniência íntegra.
- Descrição do modelo com campo `service_description` e licença comprovada; ambos os insumos com ações **ai**, **display** e **export**, finalidade **message_draft**, em todos os ancestrais. `FEATURE_AI_MESSAGES` e `FEATURE_DATA_EXPORT` habilitadas explicitamente. Esses direitos cobrem processamento, exibição do derivado e cópia; só permissão de IA não autoriza cópia.
- Evidência vigente para origem `openai`, referência **openai-responses-v1**, campo `message_draft`, finalidade `message_draft`, ações `display` e `export`. A proveniência de saída é derivada dos dois insumos e herda suas restrições/atribuições. Não há aprovação automática de licença por chave/flag.
- Releitura do catálogo/modelo e revalidação de identidade/permissões antes da chamada, após sua resposta e antes da cópia. Mudança de conteúdo, revisão do manifesto ou licença invalida a entrega/cópia anterior. A cópia usa uma prova HMAC por usuário/workspace/escopo, válida por até 15 minutos; não contém conteúdo nem segredo. A chave nunca chega ao navegador.

Google Places/Maps, demo, PageSpeed e ancestrais restritos continuam recusados pela política central. Não se aceitam URLs, fatos, prompt livre, licenças ou alegações de propriedade no DTO. Cópias manuais não mudam origem. Conteúdo externo no prompt é dado, sem ferramentas ou capacidade de comandar o servidor. Créditos exigidos são apresentados ao lado do rascunho; o operador deve garantir os requisitos também no destino manual, pois esta etapa não envia mensagens nem certifica destinos externos.

## Consumo durável e segurança

A migração **008** reutiliza `async_jobs`, `usage_counters`, `usage_reservations` e as funções de reserva/liquidação. Acrescenta somente `private.message_executor_config` com hash SHA-256 e o RPC `ag_message_attempt`. Não cria tabelas de prompts ou respostas. Schema `private` não deve ser exposto pela Data API.

O RPC invoker chama função privada definer com `search_path=''`, grants restritos e verificação de sessão, associação e segredo do backend. Opera apenas em tarefas `ai_generation` do próprio usuário/workspace. Operações comuns usam o cliente Supabase SSR e RLS, **sem chave privilegiada**. O hash é provisionado pelo operador PostgreSQL, sem auto-claim ou endpoint público para cadastro de credencial.

Antes da chamada paga, uma transação curta reserva e debita **uma tentativa**, cria tarefa `running`, `max_attempts=1` e lease de 90 s. Bloqueio transacional serializa alterações por workspace: **uma geração simultânea**, **20 novas tentativas/dia UTC**, além do teto mensal configurado em `usage_counters` para `ai_generation`. Usuário não define limite, unidades nem período no DTO. Repetir o UUID da ação não executa novamente, inclusive em outra instância do servidor. Não é um orçamento financeiro exato: tokens/preço dependem do modelo configurado e exigem limites no projeto OpenAI. Falhas/interrupções após o débito não restituem automaticamente a tentativa, inclusive se ocorrerem antes da chamada; evitar repetição paga tem prioridade sobre recuperar uma resposta não retida.

O handler aguarda uma chamada SDK por tarefa, com timeout de 30 s, `maxRetries: 0`, `max_output_tokens: 600`, `store:false`, `background:false`, sem ferramentas/histórico/`previous_response_id`. Modelo sem suporte a Responses/Structured Outputs falha, sem troca automática por outro modelo. A saída controlada é pequena; modelos que gastem o limite em raciocínio podem retornar resposta incompleta. Prazo do handler 50 s, cliente 55 s e `maxDuration=60` sujeito ao limite real da hospedagem. Não há execução em memória após resposta, `after`, `waitUntil`, fila autônoma, polling pago ou retry automático do cliente/SDK.

Concluída ou falha fica nos metadados; prompts, composições e mensagens não são persistidos em `ai_generations`, jobs, logs ou banco. Perder a resposta não permite recuperá-la do banco. Após interrupção, lease vencido é marcado falho **na próxima ação** de geração; não existe timer que execute sem usuário. Uma nova geração exige nova ação e pode consumir outra tentativa. O RPC não aceita reagendar uma tentativa iniciada.

`POST /api/mensagens` é same-origin, JSON até 4 KiB, validação estrita, autenticação/autorização por operação, refresh de cookies pelo Proxy e respostas privadas/no-store. Códigos internos do provedor/SQL, chave, Authorization, corpo HTTP e stack não são enviados à interface. SDK com logs desligados; não habilitar tracing de corpos, variáveis RPC, prompts ou respostas no proxy, Supabase, hospedagem ou APM. O usuário recebe mensagens constantes para configuração, permissão, limite e falha. Área de transferência depende de HTTPS/permissão do navegador; se a cópia automática for bloqueada após a autorização, o editor permite selecionar e copiar pelo dispositivo.

## Configuração pendente no ambiente real

1. Aplicar migrações 001–008 em um Supabase de teste/produção, com Auth e associação real já configurados; validar a função pela Data API/JWT real antes de uso.
2. Configurar **OPENAI_API_KEY** e **OPENAI_MODEL** exclusivamente no servidor (local `.env.local` ignorado ou variáveis da Vercel). Sem modelo padrão inventado. Escolher modelo com suporte a Responses e Structured Outputs, acessível ao projeto, com retenção/região/custo aprovados. Não configurar gateways ou ferramentas adicionais.
3. Configurar **MESSAGE_EXECUTOR_SECRET**, 32 bytes aleatórios codificados em 64 caracteres hexadecimais. Cadastrar somente seu SHA-256 em `private.message_executor_config(singleton,secret_sha256)` por canal administrativo confiável. Manter a credencial fora de chat, SQL versionado e logs. Rotação invalida provas de cópia anteriores; registrar o novo hash e variável de forma coordenada. Auditorias continuam usando seu segredo independente.
4. Provisionar o contador mensal `ai_generation` de cada workspace com teto aprovado (a ausência bloqueia geração); revisar limites de gasto/rate limit no projeto OpenAI. Não há contratação nem definição automática de cota comercial nesta entrega.
5. Revisar/adicionar evidências reais por campo/finalidade/ação e respectivos ancestrais; vincular modelo existente no manifesto privado, respeitando igualdade do corpo. Habilitar `FEATURE_AI_MESSAGES=true` e `FEATURE_DATA_EXPORT=true` somente depois dessa revisão. O manifesto privado não deve ir ao Git nem a `public`.

Não enviar segredos pelo chat. Nenhuma dessas configurações externas foi executada nesta etapa.

## Fontes oficiais e controles de dados

Consulta **30/10/2026**, skill OpenAI Docs, e conferência dos tipos/código do SDK instalado:

- [SDK oficial JavaScript/TypeScript](https://developers.openai.com/api/docs/libraries): pacote npm `openai` **7.45.1**, versão estável consultada no registro oficial npm; exige Node >=22, compatível com Node 22.13.0 do projeto. Dependência exata e lockfile atualizados; nenhuma outra dependência direta nova.
- [Structured Outputs / Responses](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses): `responses.parse`, `zodTextFormat`, schema estrito, detecção de recusas/saídas incompletas. Conferidos com Zod 4.6.7 e SDK instalado.
- [Controles de dados da API](https://developers.openai.com/api/docs/guides/your-data): API não usa dados para treinamento por padrão salvo opt-in; armazenamento da aplicação e logs de monitoramento de abuso têm regras distintas. **store:false não promete retenção zero**, nem configura ZDR. Aprovação da conta/modelo, retenção, processamento e região continua necessária antes de transmitir dados reais. Não há opt-in de treinamento/feedback no código.

## Verificação desta etapa

`npm.cmd install --save-exact openai@7.45.1 --offline=false --no-audit --no-fund` instalou somente o SDK; `npm.cmd run db:types` aplicou oito migrações em PGlite e gerou tipos por introspecção (**22 tabelas públicas, 13 funções, 8 enums**). Não há edição manual dos tipos.

`npm.cmd test -- src/server/messages/message.test.ts`: **2 casos aprovados**, com SDK real e `fetch` sintético, sem chamada paga, rede OpenAI, Auth hospedado ou mock de resposta silencioso no runtime. Geração válida em tom consultivo verifica opções sem chamada, payload mínimo, schema estrito, modelo configurável, texto controlado, revisão/envio manual, cota SQL, tarefa concluída, deduplicação após reiniciar serviço e permissão de cópia; erro 429 verifica mensagem constante, ausência de vazamento, falha durável e nenhuma repetição paga. O banco usa oito migrações reais + seed descartável e papel autenticado simulado; isso não comprova Supabase Auth/PostgREST real. Testes antigos preservados; somente contagem de migrações ajustada de 7 para 8.

Tipos e lint direcionado verificados nesta alteração. O sandbox bloqueou subprocesso do Vitest com EPERM; os mesmos dois testes foram executados com a permissão de subprocesso e aprovados. Suíte completa, build consolidado, navegadores, isolamento negativo amplo, clipboard em celulares físicos e chamada controlada real ficam para o Prompt 13/configuração autorizada. Nenhum resultado sintético foi gravado em banco real, nenhuma chamada paga foi feita e nenhum envio comercial ocorreu.
