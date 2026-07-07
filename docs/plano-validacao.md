# Plano de validação — CRM do Professor de Beach Tennis

> Objetivo: em **3 semanas**, decidir com dados se construímos o MVP.
> Regra de ouro: nada de código até bater os critérios da Etapa 3.

---

## Visão geral das etapas

| Semana | Etapa | Entregável | Critério de avanço |
|---|---|---|---|
| 1 | Entrevistas de dor | 10 entrevistas com professores | Dor média ≥ R$ 300/mês perdidos |
| 2 | Landing + lista de espera | Página no ar + tráfego orgânico | ≥ 30 cadastros ou conversão ≥ 10% |
| 3 | Pré-venda fundadora | 50 vagas ofertadas | ≥ 20 pagantes em 30 dias |
| 4+ | MVP (4–6 semanas) | Produto na mão dos fundadores | — |

**Critério de desistência (kill criteria):** se a semana 1 mostrar dor média < R$ 150/mês E a pré-venda fechar < 10 pagantes, o problema não é urgente o bastante — voltar ao relatório de pesquisa e reavaliar a oportunidade B (rating/matchmaking) como entrada.

---

## Etapa 1 — Entrevistas (semana 1)

### Quem entrevistar
- **10 professores autônomos** de beach tennis (que alugam quadra ou dão aula em arena de terceiros). Priorize quem tem 20+ alunos — é quem sente a dor de gestão.
- Bônus: 3 donos de arena, só para mapear a relação professor↔arena (não é o comprador do MVP).

### Onde encontrar
1. Instagram: buscar `#professordebeachtennis`, `#aulasdebeachtennis` + sua cidade; professores postam treino diariamente.
2. Arenas da sua cidade: o quadro de horários da recepção lista os professores.
3. Grupos de WhatsApp/Telegram de beach tennis da cidade (peça indicação: "quem dá aula aqui?").
4. Alunos que você conhece: "quem é seu professor? me apresenta?"

### Mensagem de abordagem (WhatsApp/Direct)
> Oi, [nome]! Vi seu trabalho no [arena/Instagram]. Estou pesquisando a rotina de professores de beach tennis pra criar uma ferramenta que resolva a parte chata (cobrança, agenda, reposição). Não estou vendendo nada — queria só 15 min no telefone pra entender como você organiza isso hoje. Topa? Em troca te dou acesso antecipado gratuito ao que sair disso.

### Roteiro de entrevista (15–20 min)
Regra: **perguntar sobre o passado, nunca sobre o futuro.** Nada de "você usaria um app que..." — isso só gera falso sim.

1. Quantos alunos você tem hoje? Quantas turmas/horários por semana?
2. Como um aluno novo chega até você? (mede a dor de prospecção)
3. Me conta como funciona sua cobrança hoje. Mensal? Pacote? Avulsa? Por onde recebe?
4. **No mês passado, quanto você deixou de receber** por atraso, esquecimento ou aluno que sumiu? (a pergunta de ouro — anotar o valor em R$)
5. Já se sentiu constrangido cobrando alguém? Me conta a última vez.
6. Como você controla a agenda? (esperar: WhatsApp/caderno/planilha) Já teve horário duplicado ou aluno que apareceu sem você esperar?
7. Aluno faltou: o que acontece? Perde a aula? Repõe? **Como você controla quem tem reposição pendente?**
8. Quanto tempo por semana você gasta com essa parte administrativa (cobrar, remarcar, responder WhatsApp de agenda)?
9. Você já pagou por alguma ferramenta pra isso? Qual? Por que abandonou (se abandonou)?
10. Se eu resolvesse UMA dessas coisas pra você amanhã, qual escolheria?

### O que registrar (planilha simples, uma linha por entrevista)
`nome | nº alunos | modelo de cobrança | R$ perdidos/mês | horas admin/semana | dor nº 1 citada | já pagou por ferramenta? | topa ser beta tester?`

### Leitura do resultado
- **Verde:** média ≥ R$ 300/mês perdidos OU ≥ 3h/semana de admin, e "cobrança/reposição" aparece como dor nº 1 em 6+ entrevistas.
- **Amarelo:** dor existe mas < R$ 150/mês → problema real porém talvez não pague R$ 79/mês; testar preço menor na pré-venda.
- **Vermelho:** professores dizem que WhatsApp + PIX "resolve bem" em 7+ entrevistas → parar e reavaliar.

---

## Etapa 2 — Landing page + lista de espera (semana 2)

### Estrutura da página (copy pronta para adaptar)

**Headline:** Pare de perder dinheiro com aula não cobrada.
**Sub:** O app do professor de beach tennis: cobrança automática no PIX, agenda sem furo e reposição sem dor de cabeça. Feito para quem vive de aula — não para academias.

**3 blocos de dor → solução:**
1. 💸 *"Cobrar aluno é constrangedor"* → Cobrança recorrente automática. O app cobra, você dá aula.
2. 📅 *"Minha agenda vive no WhatsApp"* → Agenda central com vagas por turma. Aluno agenda e cancela sozinho.
3. 🔁 *"Reposição é na base da memória"* → Saldo de aulas por aluno. Faltou? O próprio aluno escolhe uma turma com vaga do nível dele.

**CTA:** "Quero acesso antecipado" → formulário: nome, WhatsApp, cidade, nº de alunos.
**Prova de escassez honesta:** "Turma fundadora limitada a 50 professores — preço congelado para sempre."

### Ferramentas (custo ~zero)
- Página: Carrd, Framer ou uma rota estática neste próprio repo publicada na Vercel.
- Formulário: Tally ou Google Forms integrado.
- Métrica: nº de visitas (Plausible/GA) e conversão visita→cadastro.

### Divulgação orgânica
- Seu Instagram + pedir aos 10 entrevistados que compartilhem (eles já estão engajados).
- 3 posts/semana estilo "quanto você perdeu esse mês com falta e reposição?" — a linguagem colhida nas entrevistas vira o copy.
- Grupos de professores/formações de instrutores (Attiva BT e similares).

---

## Etapa 3 — Pré-venda fundadora (semana 3–4)

**Oferta:** 50 vagas · R$ 29/mês vitalício (âncora: "preço normal será R$ 79") · acesso ao beta em ~6 semanas · garantia total: se não lançar ou não gostar, devolvemos tudo.

**Como cobrar sem produto:** link de pagamento (Stripe/Mercado Pago/Asaas) — pagamento real é o único sinal de validação que não mente.

**Sequência:** oferecer primeiro aos entrevistados e à lista de espera (mensagem 1:1, não broadcast), depois abrir publicamente.

- ≥ 20 pagantes → **construir o MVP.**
- 10–19 → construir, mas com escopo ainda menor (só cobrança + agenda).
- < 10 → devolver o dinheiro, agradecer, reavaliar.

---

## Escopo do MVP (congelado — só entra isso)
1. Cadastro de alunos e turmas (dia, hora, capacidade, nível).
2. Pacotes com saldo de aulas (mensal ilimitado, 8/mês, avulsa).
3. Cobrança recorrente via PIX (Asaas/Mercado Pago API) + lembrete automático de vencimento.
4. Check-in de presença em 2 toques → falta gera crédito de reposição.
5. Link para o aluno: ver saldo, agendar reposição em turma com vaga do nível dele.

**Fora do MVP (anotar, não construir):** evolução do aluno, rating/matchmaking, financeiro da arena, torneios, app nativo (começa web/PWA).

---

## Papel deste repositório
O app Expo/React Native existente pode ser reaproveitado como casca do MVP mobile depois, mas o MVP nasce **web-first (PWA)** — professor gerencia pelo celular via navegador, sem fricção de loja de app.
