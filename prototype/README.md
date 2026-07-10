# Canetta — Protótipo de Onboarding (GLP-1)

Protótipo mobile-first navegável do onboarding do app **Canetta**, o companheiro de
tratamento para usuários de GLP-1. Um único arquivo HTML autossuficiente (sem
dependências externas), pronto para revisão de produto e posterior implementação.

## Como abrir

Abra `canetta-onboarding.html` em qualquer navegador (duplo clique). Não requer
build, servidor ou conexão.

## Navegação

- **‹ / ›** e **setas do teclado** avançam/voltam entre as telas.
- **▦ Ver todas as telas** abre a visão geral do fluxo, agrupada em Onboarding
  (01–28) e Pós-compra (29–45) — salte para qualquer tela.
- **◐ Tema** alterna o tema claro/escuro da moldura da página (a tela do app mantém
  o próprio tema, como um app real).
- **↺ Reiniciar** volta ao início com o estado zerado (útil para demos).
- Toque nas opções, digite o nome, arraste a régua e o slider — o estado se
  propaga entre as telas (nome, mascote, medicamento, peso, meta, data estimada).

## Fluxo (45 telas)

As telas 01–28 continuam sendo o onboarding/paywall. As telas 29–45 completam o
primeiro fluxo pós-compra da aplicação: lembretes, home, aplicação, check-in
pós-dose, histórico visual de locais, sintomas, peso, resumo de consulta,
exportação, linha do tempo, calendário, fotos/medidas e fontes educativas.

| # | Tela | # | Tela |
|---|------|---|------|
| 01 | Splash | 17 | Data de nascimento |
| 02 | Valor · controle de doses | 18 | Sintomas → consulta |
| 03 | Valor · jornada | 19 | Resumo pré-consulta |
| 04 | Privacidade | 20 | Refeições |
| 05 | Nome | 21 | Atividade |
| 06 | Estágio | 22 | Nome do mascote |
| 07 | Medicamento | 23 | Insight personalizado |
| 08 | Valor · registro de dose | 24 | Loading |
| 09 | Dose (filtrada por medicamento) | 25 | Reveal do plano |
| 10 | Frequência | 26 | Compromisso |
| 11 | Peso atual (régua) | 27 | Paywall |
| 12 | Altura (régua) | 28 | Pós-compra / retenção |
| 13 | Meta de peso (cálculo dinâmico) | 29 | Lembretes |
| 14 | Evolução prevista (gráfico) | 30 | Home da jornada |
| 15 | Ritmo desejado (slider) | 31 | Registro de aplicação |
| 16 | Maior dificuldade | 32 | Registro salvo |
|  |  | 33 | Check-in pós-dose |
|  |  | 34 | Check-in salvo |
|  |  | 35 | Histórico de locais |
|  |  | 36 | Registro de sintomas |
|  |  | 37 | Sintomas salvos |
|  |  | 38 | Registro de peso |
|  |  | 39 | Peso salvo |
|  |  | 40 | Resumo de consulta |
|  |  | 41 | Exportar resumo |
|  |  | 42 | Linha do tempo |
|  |  | 43 | Calendário |
|  |  | 44 | Fotos e medidas |
|  |  | 45 | Fontes educativas |

A barra de progresso aparece apenas nas 12 telas de coleta reais (05–07, 09–13,
15–17, 22).

O estágio **"Quero começar"** já tem um desenho inicial de ramificação dentro do
mesmo fluxo: as telas de medicamento, dose, frequência e registro mudam a copy
para preparação de consulta, aceitam "Ainda não sei" na dose e reforçam que o app
organiza anotações sem substituir orientação médica. A arquitetura ainda não cria
um caminho separado completo para pré-tratamento.

## Princípios aplicados

- Perguntas intercaladas com telas de valor percebido; nunca parece formulário.
- Mascote presente do começo ao fim, com estados: acenando, pensando, comemorando,
  check-in.
- Vende transformação, não funcionalidade. Sem promessas médicas agressivas, sem
  percentuais clínicos inventados, sem "milhares de usuários".
- Projeções rotuladas como estimativas — "não é uma promessa clínica".
- Privacidade e confiança em destaque.

## Posicionamento e limites (segurança regulatória)

Tese: **"IA que organiza minha jornada"**, não "IA que interpreta meus dados". O
Canetta é um **diário inteligente da jornada com GLP-1** — registra, organiza,
resume, mostra padrões observáveis e prepara o usuário para a próxima consulta.
Ele **não diagnostica, não prescreve e não substitui profissionais de saúde**.

O que o copy faz e o que evita:

| Faz (descritivo / organizacional) | Evita (orientação clínica) |
|---|---|
| "Você apontou a alimentação como seu maior desafio." | "Você precisa comer X g de proteína." |
| "Padrões observados nos seus registros — sem diagnóstico." | "Sua náusea indica que…" |
| "Resumo pronto para levar à sua consulta." | "Aumente / reduza / pare a dose." |
| Educação com fonte + "procure seu médico." | Recomendação individualizada de saúde. |

Mudanças aplicadas nesta revisão:

- **Tela 22 (Insight):** deixou de afirmar risco clínico ("perder proteína… seu
  plano compensa") e passou a **descrever um padrão** ligado à resposta do usuário +
  convite a levar à consulta, com disclaimer "não diagnostica nem recomenda".
- **Tela 26 (Paywall):** removido o benefício "assistente com IA para tirar dúvidas
  do tratamento" (terreno regulatório delicado). Em seu lugar: "Padrões observados
  nos seus registros — sem diagnóstico" e "Resumo pronto para levar à sua consulta".
- **Tela 18 (Sintomas):** reposicionada como **copiloto da consulta** — resumo
  automático (peso, doses, sintomas, fotos) + card educativo com "procure seu médico".
- **Tela 24 (Reveal):** destaque agora descreve acompanhamento e resumo para a
  consulta, sem prescrição.
- **Tela 04 (Privacidade):** boundary explícito — "não substitui profissionais de
  saúde; não diagnostica nem prescreve".
- **Tela 19 (Resumo pré-consulta):** preview agora marcado como "Exemplo · seus
  dados aparecem aqui", para não parecer histórico real do usuário durante o
  onboarding.
- **Fluxo "Quero começar":** copy inicial adaptada para pré-tratamento nas telas de
  medicamento, dose, frequência e registro, com a opção "Ainda não sei" na dose.
- **Pós-onboarding:** expandidas telas de lembretes, home, aplicação, check-in
  pós-dose, histórico visual de locais, sintomas, peso, resumo de consulta,
  exportação, linha do tempo, calendário, fotos/medidas e fontes educativas. O
  fluxo usa dose, horário, local, hidratação, refeição, peso, fotos/medidas e
  sintomas como dados registrados pelo usuário, sem recomendar conduta.

## Design system

- **Cores:** pinho-teal `#0E6B5C` (marca), menta `#22B39A` (ativo/progresso),
  damasco `#FF9E7D` (mascote/comemoração), periwinkle `#8DA9E8` (projeções),
  neutro sage-quente `#F4F6F3`.
- **Tipografia:** stack de sistema (iOS/Android nativo), com escala e numerais
  tabulares para todos os dados (kg, datas, preços).
- **Componentes:** cards de opção, chips, régua com rolagem, slider, barra de
  progresso, gráfico SVG, anéis de atividade, timeline de dose, paywall, cards
  rápidos, slots de lembrete, mapa de locais, calendário, fotos/medidas,
  fontes educativas, métricas e linha do tempo.

## Estados vazios (revisão de 09/07/2026)

As telas pós-compra reagem ao que você realmente registra na sessão:

- **Home (30):** os cards mostram "Registrada hoje ✓" só depois de salvar; o hero
  muda para "Feito por hoje" após a aplicação.
- **Resumo de consulta (40):** começa vazio ("Seu resumo começa vazio…") e ganha
  seções conforme os registros. O peso do onboarding aparece rotulado como
  "Informado no onboarding".
- **Histórico de locais (35):** mostra apenas os locais registrados pelo usuário
  em mapa visual factual; não sugere próximo local nem rotação.
- **Linha do tempo (42):** começa com estado vazio e mostra apenas os eventos
  registrados (aplicação, check-in pós-dose, sintomas, peso) + o próximo lembrete.
- **Calendário (43):** mostra lembrete configurado e registros factuais, sem
  definir horário ideal.
- **Fotos e medidas (44):** estrutura o acompanhamento visual como dado privado
  e controlado pelo usuário, sem avaliação corporal.
- **Fontes educativas (45):** organiza fontes e checklist editorial; links
  profundos e revisão clínica seguem pendentes.
- **Ramificação "Quero começar":** no pós-compra, o lembrete vira check-in
  semanal de preparação, a home orienta a montar a lista de dúvidas e a tela de
  registro aceita guardar orientações recebidas.

## Fontes do conteúdo educativo

A tela 18 lista as fontes nomeadas (Bulário Eletrônico Anvisa, diretrizes ABESO,
SBEM) e o selo da tela 25 as referencia. Links profundos (bula por medicamento,
documento específico) e revisão por consultor médico/nutricionista ainda pendem.

## Placeholders conhecidos

- Valores de preço (R$ 149,90/ano, R$ 29,90/mês) são placeholders para revisão.
- O resumo pré-consulta da tela 19 é um exemplo visual de como os dados aparecerão
  depois de registros reais.
- A projeção da tela 14 é uma estimativa visual, não uma promessa clínica.
- Links profundos das fontes educativas (telas 18 e 25) ainda não apontam para
  URLs reais; a tela 45 já separa o espaço para esses links e revisão.
- As telas pós-onboarding persistem apenas no `state` local do protótipo, não
  enviam notificações reais e não substituem backend/autenticação.
  A exportação baixa um `.txt` local no protótipo; no app real deve virar PDF e
  compartilhamento controlado pelo usuário.
