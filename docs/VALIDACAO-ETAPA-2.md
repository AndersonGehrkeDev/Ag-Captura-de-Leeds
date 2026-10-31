# Validação — Prospecção de Empresas

Data: **27/10/2026**. Escopo: etapa 2, interface e demonstração local. Ambiente: Windows, Node.js 22.13.0, npm 10.9.2 e Chromium do Playwright 1.64.1. Nenhuma chave externa foi necessária.

## Resultado

- `npm.cmd run check`: aprovado — lint sem warnings, checagem de tipos, **22 testes unitários** em 3 arquivos e build Next.js de produção.
- `npm.cmd run test:e2e`: aprovado — **21 testes de navegador**. Inclui 9 testes da base/configurações preservadas, 9 dimensões da prospecção e 3 fluxos de estado/integração da interface.
- **54 capturas locais** geradas no conjunto completo: 21 da base e 33 da prospecção. Relatório reproduzível em `playwright-report/index.html`.
- Não foram adicionadas dependências; `package.json` e o lockfile da fundação foram preservados.

## Matriz da prospecção

| Viewport | Apresentação | Resultado |
| --- | --- | --- |
| 360 × 800 | Menu recolhível, filtros expansíveis, lista em cards, detalhes em drawer | Aprovado |
| 390 × 844 | Menu recolhível, filtros expansíveis, lista em cards, detalhes em drawer | Aprovado e inspecionado visualmente |
| 768 × 1024 | Menu recolhível, tabela com rolagem localizada, detalhes em drawer | Aprovado |
| 1024 × 768 | Menu lateral, pesquisa em duas colunas, detalhes em drawer | Aprovado |
| 1366 × 768 | Composição desktop com painel direito | Aprovado e inspecionado visualmente |
| 1536 × 960 | Composição desktop com painel direito | Aprovado |
| 1536 × 1024 | Composição desktop na dimensão principal do mockup | Aprovado e inspecionado visualmente |
| 800 × 360 | Celular horizontal, detalhes em drawer com rolagem interna | Aprovado |
| 844 × 390 | Celular horizontal, detalhes em drawer com rolagem interna | Aprovado e drawer inspecionado visualmente |

O desktop usa menu de **238 px** e painel direito de **335 px**, com espaços de 12 px entre filtros e mapa e 14 px entre centro e painel direito. A medição confirmou que o centro termina antes da coluna direita. Na tela de 1536 × 1024, filtros e mapa começam próximos de y=156 e a tabela de y=614, preservando a organização da referência. Controles principais de 44 px demandam mais altura que alguns controles do mockup; resoluções baixas permitem rolagem vertical, sem cortar o acesso às ações.

## Evidências locais

Para cada dimensão, os arquivos ficam em `test-results/prospecting-prospecção-<largura>x<altura>/`:

- `prospeccao.png`: captura do viewport inicial.
- `prospeccao-completa.png`: composição completa, com rolagem vertical.
- `lista.png`: aba Lista, com tabela ou cards conforme a largura.
- `detalhes.png`: drawer nas seis dimensões abaixo de 1280 px.

As capturas das três dimensões solicitadas foram comparadas à imagem principal fornecida pelo usuário. Também foram inspecionados a lista/cards em 390 px e os drawers em 390 × 844 e 844 × 390. Os arquivos em `test-results/` são artefatos locais ignorados pelo Git; podem ser recriados executando os comandos abaixo.

```powershell
npm.cmd run check
npm.cmd run test:e2e
```

## Fluxos verificados

- Idioma e regressão das páginas técnicas, preservadas em `/base` e `/configuracoes`.
- Prospecção inicial sem consulta, com métricas “—”, busca real desabilitada e entrada explícita na demonstração. Sair da demonstração retorna ao estado sem dados, sem ativação por ausência de credenciais.
- Indicadores consistentes com as oito fixtures: 8 empresas, 4 sem site, 2 com melhoria sugerida, 2 com site adequado e 1 lead inicialmente ilustrativo.
- Alternância Mapa/Lista, seleção de empresa, drawer em tablet/celular, anotações e retorno de foco ao acionador após Escape.
- Filtros por nicho e palavra-chave, busca global, estado sem resultados e isolamento entre fontes ausentes e exemplos locais.
- Inclusão de lead demonstrativo sem duplicar contagem; notas preservadas ao trocar de empresa; edição e cópia de mensagem de exemplo, sem envio ou chamada à OpenAI.
- Ausência de erros JavaScript, requisições a domínios externos e rolagem horizontal da página. A tabela tem seu próprio contêiner de rolagem.

## Problemas encontrados e corrigidos

- O grid interno herdava a largura mínima da tabela e ultrapassava o centro em tablet/desktop compacto. Foi definida uma coluna `minmax(0, 1fr)` no grid interno e preservada a rolagem localizada da tabela. O teste confirma que a coluna direita não sobrepõe o centro.
- O painel de pesquisa inicialmente empurrava a tabela muito abaixo da referência. O aviso de demonstração foi integrado ao cabeçalho desktop, e o callout dos filtros foi compactado, mantendo os alvos de 44 px.
- A identificação dos campos de mensagem/anotação era duplicada entre coluna desktop e drawer. Cada instância agora usa `useId`.
- A base técnica passou para `/base` em vez de ser descartada; seus testes foram ajustados para a nova rota e continuam aprovados.

## Pendências reais e limites

- Logo original não disponibilizada no projeto: identificação textual provisória, sem símbolo inventado. Origem da imagem fictícia e prompt em [ASSETS-ETAPA-2.md](ASSETS-ETAPA-2.md).
- Google Places/Maps, PageSpeed, Supabase Auth/PostgreSQL/RLS, CRM persistente e OpenAI não estão integrados nesta etapa. Exportação, módulos adicionais e contratação de planos não foram implementados. Os controles correspondentes informam isso, sem simular sucesso.
- Mapa, avaliações, pontuação e consumo do plano são sintéticos. A abrangência não calcula distância. Não há telefones reais ou links para empresas reais nas fixtures.
- Mensagens são templates locais de exemplo, não geração por IA. Leads, notas e textos editados ficam em memória da tela e podem se perder ao recarregar ou sair da rota; nenhum registro foi salvo em banco ou em armazenamento persistente do navegador.
- Não houve teste físico de teclado virtual, áreas seguras ou dispositivos iOS/Android reais. Foram usados viewport, toque emulado, teclado e capturas do Chromium; CSS contempla áreas seguras e altura dinâmica.
- Os estados de erro remoto de provedores não são testáveis nesta etapa, pois não existe chamada externa implementada. Estados de indisponibilidade, configuração ausente e busca demonstrativa sem resultados foram verificados.
