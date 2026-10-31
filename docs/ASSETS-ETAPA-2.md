# Assets e identidade — interface de prospecção

## Identificação da AG

O projeto não continha um arquivo original de logo da AG Soluções Digitais. A imagem de referência contém a marca dentro de um mockup, mas não substitui o arquivo original de identidade. Foi mantida uma **identificação textual provisória**, com “AG” e “SOLUÇÕES DIGITAIS”, sem criar símbolo ou afirmar que se trata da logo original.

A identificação está centralizada em `src/components/layout/app-navigation.tsx`, na função `Brand`. Substituir por um asset original fornecido pelo usuário quando estiver disponível. O texto AG no pequeno laptop promocional também é ilustrativo, não um novo logotipo.

## Imagem de estabelecimento fictício

- Arquivo final: [`public/demo/pizzaria-ficticia.png`](../public/demo/pizzaria-ficticia.png).
- Origem: geração pela ferramenta integrada `image_gen`, seguindo a skill `imagegen`; não foi utilizada a API OpenAI configurável da aplicação nem uma credencial do usuário.
- Uso: foto ilustrativa de duas fixtures sintéticas de restaurante e miniaturas correspondentes. A reutilização é intencional; não são fotos de empresas reais distintas.
- Identificação na interface: “Imagem ilustrativa”, em uma rota que informa “Modo demonstração” e “Dados fictícios”.
- O arquivo gerado foi copiado para o projeto. Não depende de Downloads, diretório temporário ou caminho externo para funcionar.

Prompt final utilizado (geração nova, ferramenta integrada, sem imagem alvo de edição):

```text
Use case: photorealistic-natural. Asset type: small horizontal header image for a clearly labeled synthetic demonstration of a Brazilian business prospecting dashboard. Generate one photorealistic wide photograph, aspect ratio 2:1: exterior of a fictional welcoming pizzeria in São Paulo at dusk, charcoal storefront, rich warm amber and golden lighting, brick and glass frontage, subtle potted plants, wood fired oven glow, empty tables visible, cinematic but natural commercial photography. Framing entire shop front straight on with slight perspective, no people, no logos, absolutely no text or signs with readable lettering. Palette near-black graphite warm gold and amber. This is an illustrative fictional business image, no specific real location. No UI, no map, no collage, no watermark.
```

## Mapa, ícones e promoção

O mapa é SVG produzido em código em `src/features/mapas/components/demo-map.tsx`, com posições relativas e ruas ilustrativas. Não foi copiado de Google Maps, não tem precisão geográfica nem atribuição falsa ao Google. Marcadores e contagens correspondem somente às fixtures visíveis. A legenda informa que o mapa e as posições são fictícios. Zoom e restauração afetam apenas a ilustração local.

Ícones vêm da dependência `lucide-react` já adotada na base. Os demais avatares são ícones de categoria em superfícies coloridas, sem fingir fotografias de empresas. O laptop promocional é uma ilustração em CSS, não uma captura de um produto publicado.
