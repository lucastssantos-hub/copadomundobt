# Canetta — Protótipo de Onboarding (GLP-1)

Protótipo mobile-first navegável do onboarding do app **Canetta**, o companheiro de
tratamento para usuários de GLP-1. Um único arquivo HTML autossuficiente (sem
dependências externas), pronto para revisão de produto e posterior implementação.

## Como abrir

Abra `canetta-onboarding.html` em qualquer navegador (duplo clique). Não requer
build, servidor ou conexão.

## Navegação

- **‹ / ›** e **setas do teclado** avançam/voltam entre as telas.
- **▦ Ver todas as telas** abre a visão geral do fluxo (salte para qualquer tela).
- **◐ Tema** alterna o tema claro/escuro da moldura da página (a tela do app mantém
  o próprio tema, como um app real).
- Toque nas opções, digite o nome, arraste a régua e o slider — o estado se
  propaga entre as telas (nome, mascote, medicamento, peso, meta, data estimada).

## Fluxo (27 telas)

| # | Tela | # | Tela |
|---|------|---|------|
| 01 | Splash | 15 | Ritmo desejado (slider) |
| 02 | Valor · controle de doses | 16 | Maior dificuldade |
| 03 | Valor · jornada | 17 | Data de nascimento |
| 04 | Privacidade | 18 | Sintomas → consulta |
| 05 | Nome | 19 | Refeições |
| 06 | Estágio | 20 | Atividade |
| 07 | Medicamento | 21 | Nome do mascote |
| 08 | Valor · registro de dose | 22 | Insight personalizado |
| 09 | Dose (filtrada por medicamento) | 23 | Loading |
| 10 | Frequência | 24 | Reveal do plano |
| 11 | Peso atual (régua) | 25 | Compromisso |
| 12 | Altura (régua) | 26 | Paywall |
| 13 | Meta de peso (cálculo dinâmico) | 27 | Pós-compra / retenção |
| 14 | Evolução prevista (gráfico) | | |

A barra de progresso aparece apenas nas 12 telas de coleta reais (05–07, 09–13,
15–17, 21).

## Princípios aplicados

- Perguntas intercaladas com telas de valor percebido; nunca parece formulário.
- Mascote presente do começo ao fim, com estados: acenando, pensando, comemorando,
  check-in.
- Vende transformação, não funcionalidade. Sem promessas médicas agressivas, sem
  percentuais clínicos inventados, sem "milhares de usuários".
- Projeções rotuladas como estimativas — "não é uma promessa clínica".
- Privacidade e confiança em destaque.

## Design system

- **Cores:** pinho-teal `#0E6B5C` (marca), menta `#22B39A` (ativo/progresso),
  damasco `#FF9E7D` (mascote/comemoração), periwinkle `#8DA9E8` (projeções),
  neutro sage-quente `#F4F6F3`.
- **Tipografia:** stack de sistema (iOS/Android nativo), com escala e numerais
  tabulares para todos os dados (kg, datas, preços).
- **Componentes:** cards de opção, chips, régua com rolagem, slider, barra de
  progresso, gráfico SVG, anéis de atividade, timeline de dose, paywall.

> Valores de preço (R$ 149,90/ano, R$ 29,90/mês) são placeholders para revisão.
