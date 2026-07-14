# MazyOS — Sistema operacional do negócio

Sua empresa roda em cima desse arquivo. Aqui ficam as regras de operação
do MazyOS — como o Claude lê o contexto, aprende com correções, mantém
tudo atualizado e cria skills novas conforme a operação evolui.

Esse arquivo é editável. Quando o `/instalar` rodar, ele complementa o
final dessa página com as regras específicas do seu negócio.

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos (quando existirem
e estiverem preenchidos):

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Seguir o fluxo da skill-creator nativa do Claude Code

---

# Lucas Santos — Operação freelancer (perfil Freelancer)

> Bloco específico do negócio, aplicado pelo `/instalar`. Vende tempo e
> talento pra clientes terceiros. O sistema gira em torno de captar,
> entregar e cobrar.

## O que é esse workspace

Operação freelancer do Lucas — implementação de automação operacional com
IA. Aqui ficam os clientes, propostas, entregas, cobrança e o marketing
do próprio Lucas.

**Estrutura de pastas:**
- `_memoria/` — quem sou, como falo, foco atual
- `identidade/` — marca pessoal aplicada nas entregas (a definir)
- `marketing/` — conteúdo do próprio Lucas (prospecção, Insta, LinkedIn)
- `saidas/` — emails, documentos, propostas pontuais
- `dados/` — arquivos a analisar
- `clientes/` — uma subpasta por cliente (criar conforme fechar)

## Quem sou

Sou Lucas Santos, freelancer de **implementação operacional com IA** —
automatizo processos manuais dentro das empresas. Especialista em
**esporte e fitness** (beach tennis, treinamento esportivo), mas atendo
qualquer nicho.

## Meu serviço

- Automação de processos manuais com IA
- Estruturação de operação (fluxos, integrações)
- Conteúdo + qualificação de lead conectando no WhatsApp (em construção)

Ticket médio: *a definir (precificação é prioridade agora).*
Capacidade simultânea: solo — poucos projetos ao mesmo tempo.

## Clientes ativos

- **Mareb Sports** — nicho esporte / beach tennis. Projetos: apps BT Vision
  e LT Performance.

## Como trabalho

Solo, com o MazyOS como operação. Entrega baseada em IA. *(Processo de
briefing/entrega vai sendo formalizado com o uso.)*

## Tom de voz

Direto e informal, conversa de gente real (ver `_memoria/preferencias.md`).
Evitar: jargão de guru ("alavancar", "sinergia", "destravar potencial",
"vamos juntos!"), formalidade artificial, emoji em contexto sério.

## Regras do sistema

- Cliente novo → criar pasta `clientes/<Nome>/` com `briefing.md`
- Proposta → `clientes/<Nome>/proposta.html` (ou em `saidas/` se ainda não fechou)
- Prioridade atual do Lucas: prospecção e precificação — ao sugerir, atacar isso primeiro

## Ferramentas conectadas

- [ ] Notion
- [ ] Gmail
- [ ] Google Calendar
- [ ] WhatsApp (contato final do lead)
- [ ] Stripe / cobrança

*(Marcar conforme for instalando os MCPs)*
