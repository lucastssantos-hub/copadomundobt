---
name: inscricao-copa
description: >
  Processa a inscrição de uma equipe da Copa do Mundo de Beach Tennis. Recebe a
  lista que o capitão mandou (texto colado do WhatsApp, ficha preenchida ou planilha)
  e gera: (1) pedido de camiseta somado por tamanho/modelagem, (2) lista de atletas
  formatada pra subir no LED display, (3) consolidado geral. Salva tudo em
  projetos/copa-do-mundo-bt/inscricoes/. Use quando o Lucas disser "processar inscrição",
  "chegou a equipe do capitão X", "montar pedido de camiseta", "fechar as camisetas"
  ou colar uma lista de atletas da copa.
---

# /inscricao-copa — Inscrição de equipe + pedido de camiseta

Skill do projeto Copa do Mundo de Beach Tennis. Resolve o gargalo mais crítico:
transformar a lista solta que o capitão manda num **pedido de camiseta pronto** e
numa **lista pronta pro LED display**, sem digitação manual.

Contexto do processo em `projetos/copa-do-mundo-bt/briefing.md`. Regras do projeto
no `CLAUDE.md` da pasta.

## Regra de ouro do prazo

Camiseta precisa de **25 dias** de antecedência. A inscrição das equipes só chega
~15 dias antes. Então o **tamanho de camiseta é coletado antes** do fechamento da
inscrição. Se faltar tamanho de algum atleta, **sinalizar em destaque** — nunca
deixar passar silenciosamente.

## Entrada aceita

Qualquer um destes, do jeito que o capitão mandou:
- Texto colado do WhatsApp (mesmo bagunçado)
- Ficha `inscricoes/modelo-equipe.md` preenchida
- Planilha (CSV/colado)

## Workflow

### Passo 1 — Ler e normalizar

Extrair, por atleta: **nome completo, categoria, tamanho de camiseta, modelagem**
(masculina/feminina/baby look). Normalizar tamanhos pra PP · P · M · G · GG · XG.
Registrar também: nome da seleção, etapa/cidade, capitão e WhatsApp.

### Passo 2 — Apontar buracos ANTES de gerar

Listar em destaque tudo que faltou:
- Atleta sem tamanho de camiseta → 🔴 (bloqueia o pedido)
- Atleta sem categoria → 🟡
- Modelagem não informada → assumir Masculina e marcar como suposição

Se houver 🔴, avisar que o pedido de camiseta sai incompleto e sugerir a mensagem
pronta pro capitão (ver Passo 5).

### Passo 3 — Gerar o pedido de camiseta

Salvar em `inscricoes/<etapa>/pedido-camisetas.md` uma tabela somada:

```
Modelagem  | PP | P | M | G | GG | XG | Total
Masculina  |    |   |   |   |    |    |
Feminina   |    |   |   |   |    |    |
Baby look  |    |   |   |   |    |    |
TOTAL GERAL: N camisetas
```

### Passo 4 — Gerar o arquivo que alimenta o bot de inscrição

O letzplay **não importa arquivo** e a inscrição na mão é lenta — mas o Lucas tem um
**bot de automação de navegador** (mora na pasta da Copa do Mundo no computador dele)
que inscreve sozinho no letzplay. O bot precisa de **nome + categoria** por atleta.

Salvar em `inscricoes/<etapa>/bot-inscricao.csv` com as colunas exatas que o bot lê:

```
nome,categoria
Fulano de Tal,A
Beltrano de Tal,35+
```

Regras do arquivo do bot:
- Só entra atleta **com nome E categoria** preenchidos. Quem tiver categoria pendente
  (🟡) fica de fora do CSV e é listado à parte pra completar antes de rodar o bot.
- Categoria normalizada pra: A, B, C, D, E, 35+, 60+.
- Se o formato/ordem de colunas do bot for diferente do padrão acima, ajustar pra bater
  com o que o bot espera (confirmar com o Lucas na primeira vez).

### Passo 5 — Consolidar e devolver

- Atualizar `inscricoes/<etapa>/consolidado.md` (todas as equipes daquela etapa,
  com total de atletas e total de camisetas por tamanho — acumulado).
- Mostrar pro Lucas: resumo da equipe, pendências (🔴/🟡) e o que foi salvo.
- Se faltou dado, oferecer a mensagem pronta pro capitão, no tom do
  `_memoria/preferencias.md` (direto, informal, sem jargão). Ex:
  > "Fala, [capitão]! Fechando as camisetas da [seleção]. Faltou o tamanho de:
  > [nomes]. Me manda que aí garanto que fica pronto a tempo. Valeu!"

## Regras

- **Nunca** gerar pedido de camiseta dando tamanho como certo quando não foi informado — marca como pendência.
- Não inventar categoria nem nome. Dado que faltou, fica como pendência explícita.
- Uma pasta por etapa dentro de `inscricoes/` (ex.: `inscricoes/umuarama/`).
- Ao terminar, se surgiu info nova de processo (formato do LED display, prazo real
  da gráfica, categorias oficiais), sugerir atualizar o `briefing.md`.
