# AGENTS.md — Canetta (onboarding GLP-1)

Handoff para continuar o produto. Leia isto por inteiro antes de mexer em qualquer
tela ou copy. Companion: `README.md` (uso do protótipo) e o próprio arquivo
`canetta-onboarding.html`.

---

## 1. O que é o Canetta

Um **companheiro de tratamento para usuários de GLP-1** (Ozempic, Mounjaro,
Wegovy, etc.). Ajuda a acompanhar doses, peso, refeições, sintomas, hábitos,
progresso e consultas.

**Tese central (importante):** *"IA que **organiza** minha jornada"*, **não** "IA
que interpreta meus dados". O Canetta é um **diário inteligente**: registra,
organiza, resume, mostra padrões observáveis e prepara o usuário para a consulta.

**Tom:** acolhedor, confiável, moderno, responsável. Nunca "app milagroso de
emagrecimento".

## 2. Status atual

- **Entregue:** protótipo mobile navegável de **38 telas** (28 de onboarding +
  10 pós-compra/pós-onboarding), em pt-BR, como
  **arquivo único** `canetta-onboarding.html` (HTML+CSS+JS inline, SVG do mascote
  inline, zero dependências, zero build). Abre direto no navegador e também é
  publicável como Artifact.
- **Não feito ainda:** implementação em app real (o repositório é um projeto
  Expo/React Native, mas o Canetta ainda não tem código de app), backend,
  autenticação, persistência real, notificações reais e conteúdo educativo real
  com fontes.

## 3. Limites regulatórios — OBRIGATÓRIO

O maior risco do produto é cruzar a linha entre **acompanhamento** e **orientação
clínica**. Qualquer copy ou feature nova precisa respeitar isto:

**PODE (descritivo / organizacional):**
- Registrar (doses, peso, sintomas, água, refeições, fotos).
- Organizar (calendário, histórico, gráficos, linha do tempo, relatórios).
- Mostrar padrões observados: *"Você registrou náusea em 3 das 4 aplicações."*
- Educar com fonte + encaminhar: *"...se for intensa ou persistente, procure seu médico."*
- Preparar a consulta (resumo pré-consulta = "copiloto da consulta").

**NÃO PODE (orientação clínica):**
- Recomendar conduta: "aumente/reduza/pare a dose", "troque de medicamento".
- Prescrever metas: "coma X g de proteína", "consuma 1.500 kcal".
- Interpretar sintoma como diagnóstico: "sua náusea indica que…".
- Responder dúvidas de tratamento ("posso misturar com álcool?", "posso adiantar a dose?").
- Inventar números clínicos, percentuais de eficácia, ou "milhares de usuários".

Boundary explícito já presente no app (tela 04 e 23): *"O Canetta organiza sua
jornada e não substitui profissionais de saúde — não diagnostica nem prescreve."*

## 4. As 38 telas

Ordem estratégica do onboarding (não reordenar sem motivo forte — perguntas são
intercaladas com telas de valor de propósito). Barra de progresso só nas **12
telas de coleta**. As telas 29–38 cobrem o primeiro fluxo pós-compra:
lembretes, home, aplicação, sintomas, peso, consulta e linha do tempo.

| # | Tela | Coleta? |
|---|------|:---:|
| 01 | Splash | |
| 02 | Valor · controle de doses (timeline) | |
| 03 | Valor · jornada | |
| 04 | Privacidade + boundary de saúde | |
| 05 | Nome | 1/12 |
| 06 | Estágio (usando / quero começar) | 2/12 |
| 07 | Medicamento | 3/12 |
| 08 | Valor · registro de dose | |
| 09 | Dose (filtrada por medicamento) | 4/12 |
| 10 | Frequência | 5/12 |
| 11 | Peso atual (régua) | 6/12 |
| 12 | Altura (régua) | 7/12 |
| 13 | Meta de peso (−X kg dinâmico) | 8/12 |
| 14 | Evolução prevista (gráfico) | |
| 15 | Ritmo desejado (slider + mascote) | 9/12 |
| 16 | Maior dificuldade | 10/12 |
| 17 | Data de nascimento | 11/12 |
| 18 | Sintomas → consulta | |
| 19 | Resumo pré-consulta ("copiloto da consulta") | |
| 20 | Refeições (scanner + macros) | |
| 21 | Atividade (anéis + integração saúde) | |
| 22 | Nome do mascote | 12/12 |
| 23 | Insight (padrão observado, descritivo) | |
| 24 | Loading (anel + 3 etapas) | |
| 25 | Reveal do plano (+ selo "Conteúdo com fontes") | |
| 26 | Compromisso | |
| 27 | Paywall (anual/mensal) | |
| 28 | Pós-compra / retenção | |
| 29 | Lembretes | |
| 30 | Home da jornada | |
| 31 | Registro de aplicação | |
| 32 | Registro salvo | |
| 33 | Registro de sintomas | |
| 34 | Sintomas salvos | |
| 35 | Registro de peso | |
| 36 | Peso salvo | |
| 37 | Resumo de consulta | |
| 38 | Linha do tempo | |

## 5. Design system

Definido como CSS custom properties no topo do `<style>`. **Tokens do app são fixos**
(a tela do app tem tema próprio); **tokens do "shell" da página** respondem a
light/dark do visualizador.

- **Cores:** `--brand #0E6B5C` (pinho-teal), `--brand-2 #22B39A` (menta/ativo),
  `--accent #FF9E7D` (damasco), `--data #8DA9E8` (periwinkle p/ gráficos),
  `--paper #F4F6F3` (neutro sage-quente), `--ink #16302B`.
- **Tipografia:** stack de sistema (nativo iOS/Android). Hierarquia por
  peso/tamanho/tracking; `tabular-nums` em todos os dados (kg, datas, preços).
- **Componentes:** cards de opção (`.opt`), chips (`.chip`), régua com scroll
  (`.ruler`), slider de ritmo (`.pace`), barra de progresso (`.ptrack/.pfill`),
  gráfico SVG (`projChart`), anéis (`activityRings`), timeline de dose (`.tl`),
  relatório pré-consulta (`.report`), planos (`.plan`), mascote (`mascot()`).

## 6. Arquitetura do protótipo (para estender)

Tudo em `canetta-onboarding.html`. O arquivo **não** tem `<!doctype>/<html>/<head>/
<body>` (para ser compatível com Artifact) — começa em `<meta>/<title>/<style>`.

- **`state`** (objeto JS): `name, stage, medication, dose, freq, weight, height,
  goal, ritmo, difficulty, mascot, plan, doseLocal, doseNote, reminderDay,
  reminderTime, symptomFocus, symptomNote, newWeight, didDose, didSymptom,
  didWeight`. Placeholders se propagam entre telas. As flags `did*` são setadas
  pelos botões "Salvar" das telas 31/33/35 e controlam os estados vazios de
  home (30), resumo (37) e linha do tempo (38).
- **Helpers de texto:** `nm()/Nm()` (nome), `med()`, `mascotN()`, `difLabel()`,
  `diffKg()`, `estDate()` (data estimada a partir do ritmo).
- **`DOSES`**: mapa medicamento → lista de doses (usado na tela 09).
- **`mascot(mood, size)`**: retorna SVG do mascote (uma "caneta" GLP-1). Moods:
  `wave`, `think`, `cheer`, `checkin`, `calm`.
- **`S`** (array): cada tela é `S.push({ title, step?, render })`. `render()`
  retorna `{ body, cta?, init?, step?, bare?, tap? }`:
  - `body`: HTML da tela; `cta`: HTML do rodapé; `init`: callback pós-render
    (wire de régua/slider/loading); `bare`: remove o padding padrão (splash,
    loading, pós-compra); `tap`: avança ao tocar (splash).
  - `step` (1..12) liga a barra de progresso (`STEP_TOTAL = 12`).
  - Botões/opções com `data-set="chave" data-val="valor"` atualizam `state`;
    `data-adv` avança automaticamente.
- **Interações:** `initRuler()`, `initPace()`, `runLoading()`.
- **Navegação:** `draw()` renderiza a tela atual; `next()/prev()/goTo(i)`;
  setas do teclado; botão "▦ Ver todas as telas" (grid, agrupado em Onboarding /
  Pós-compra); "◐ Tema"; "↺ Reiniciar" (recarrega com estado zerado).
- **Microinterações:** cada tela entra com stagger sutil (classe `enter` no
  `.body`/`.foot`, keyframe `screenIn`); seleções têm `pop` e `:active`.
  Tudo respeita `prefers-reduced-motion`.
- **Contador** é dinâmico (`S.length`) — adicionar/remover telas não quebra o "X / N".

Para adicionar uma tela: crie um `S.push({...})` na posição desejada (a ordem do
array = ordem do fluxo). Reaproveite os componentes/helpers existentes.

## 7. O que é placeholder (não é dado real)

- **Preços:** R$ 149,90/ano e R$ 29,90/mês (tela 27) — a definir.
- **Resumo pré-consulta (tela 19):** números de exemplo (−4 kg, "3 de 4 semanas",
  fotos Sem 1/2/4) para ilustrar o preview de onboarding; o usuário ainda não
  registrou nada nesse momento. O protótipo deve manter o rótulo explícito
  "Exemplo · seus dados aparecem aqui" nessa tela.
- **Evolução prevista (tela 14):** projeção visual a partir das respostas, rotulada
  como "não é uma promessa clínica". Não é cálculo clínico.
- **Conteúdo educativo:** a tela 18 e o selo da tela 25 agora **nomeiam** as
  fontes (Bulário Eletrônico Anvisa, diretrizes ABESO, SBEM), mas os links
  profundos (URL da bula de cada medicamento, documento específico de diretriz)
  e a revisão por consultor médico/nutricionista ainda estão pendentes.
- **Pós-onboarding (telas 29–38):** persistem só no `state` local (sem backend/
  notificações). Home (30), resumo (37) e linha do tempo (38) agora têm
  **estados vazios reais**: só mostram aplicação/sintoma/peso que o usuário
  registrou na sessão (flags `didDose/didSymptom/didWeight`); antes de qualquer
  registro, exibem estado vazio explicativo. O peso do onboarding aparece como
  "Informado no onboarding" (dado real do usuário, não mock).

## 8. Próximos passos candidatos (a decidir)

**Refino do protótipo:**
- ~~Estados vazios~~ (feitos para home/resumo/linha do tempo) — restam
  microinterações adicionais.
- Fontes: nomeadas (Anvisa/ABESO/SBEM); faltam links profundos e revisão de
  consultor.
- Decisão de preços e trial do paywall (segue placeholder).
- Conectar o pós-onboarding a persistência real, notificações reais, calendário e
  exportação/compartilhamento de resumo quando a implementação Expo/RN começar.

**Ramificação "Quero começar" (pré-tratamento):**
- Onboarding: medicamento, dose, frequência e registro mudam a copy para
  organização pré-consulta; dose aceita "Ainda não sei".
- Pós-compra (revisão de 09/07/2026): lembrete vira "check-in semanal" de
  preparação, a home orienta a preparar a lista de dúvidas ("Guardar anotação"),
  e a tela 31 aceita registrar orientações recebidas antes da primeira aplicação.
- Segue em aberto decidir se esse estágio merece um caminho separado de verdade
  (menos coleta, mais preparação de consulta) — hoje é adaptação de copy no mesmo
  fluxo, sem recomendar início ou conduta.

**Implementação do app (Expo/React Native, já no repo):**
- Traduzir o design system (tokens/componentes) para RN.
- Implementar o fluxo de onboarding como stack de navegação.
- Persistência local do `state` (o repo já tem `@react-native-async-storage`).
- Telas pós-onboarding: home, registro de dose, calendário, relatório pré-consulta
  em PDF (o repo já tem `expo-print`).

## 9. Não fazer
- Não adicionar orientação clínica (ver seção 3).
- Não inventar números clínicos nem provas sociais.
- Não remover o mascote nem descaracterizar o tom.
- Não reordenar as telas sem motivo de produto.
- Não transformar o Canetta em app médico/prescritivo.
