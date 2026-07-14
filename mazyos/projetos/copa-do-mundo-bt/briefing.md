# Briefing — Copa do Mundo de Beach Tennis

> Projeto criado em 2026-07-14. Operação própria do Lucas (não é cliente).

## O que é

Copa do Mundo de Beach Tennis — circuito de equipes/seleções, com etapas em
várias cidades (Umuarama, Campo Mourão, Maringá...). Instagram: @circuitodeequipes
("Copa do Mundo de BT | BAPER BEACH SPORTS", ~1,1k seguidores, 198,5k views/30d).
Baper Beach Sports aparece como naming/patrocinadora.

Lucas toca, executa e entrega tudo sozinho. Objetivo do projeto no MazyOS:
**automatizar o processo inteiro do evento**, tirando o trabalho manual das costas.

## Processo atual (ponta a ponta de uma etapa)

1. **Fechar a arena** — reservar o local. É o gatilho que destrava o resto.
2. **Abrir inscrição pra CAPITÃES** — não abre pro atleta direto. Cada capitão é
   responsável por 1 equipe/seleção; ele monta a equipe inteira e faz o processo
   de inscrição. Contato do Lucas é **direto com cada capitão**.
3. **Confirmação dos capitães** — capitão confirma que entra numa seleção. Conta-se
   quantas seleções estarão na copa.
4. **Montar o cronograma** da copa (com base no nº de seleções).
5. **Anunciar os capitães no Instagram** — divulgação de quem são.
6. **Posts de aquecimento** — sequência de posts até a data, depois de definidos os capitães.
7. **Falar com os capitães** — tirar dúvidas + tocar a captação/inscrição (trabalho manual pesado).
8. **Inscrever os atletas** — pedir camiseta pra todos os atletas, **com o tamanho** de cada um.
9. **Subir inscrição no LED display** — sistema que gera chaves e confrontos
   automaticamente. As chaves são automáticas, mas **a inscrição sobe manual**.
10. **Prospecção de patrocinadores** — pro evento, pra aumentar a margem de lucro.

## Entregas previstas (o que o MazyOS vai automatizar)

- Inscrição/gestão de capitães e atletas (dados + tamanho de camiseta) → `inscricoes/`
- Conteúdo de Instagram (anúncio de capitães + posts de aquecimento) → `conteudo/`
- Prospecção de patrocinadores (lista + abordagem + proposta) → `patrocinadores/`
- Preparação dos dados no formato do LED display

## Sistemas envolvidos

- **LED display** — gera chaves/confrontos (inscrição sobe manual). *[confirmar nome/URL exatos]*
- **letzplay.me** — link de inscrição/torneio (ex: letzplay.me/t/62575). *[confirmar o papel exato]*
- **Instagram** @circuitodeequipes — divulgação.
- **WhatsApp / Direct** — contato com capitães.

## Pontos a confirmar

- Como funciona hoje a inscrição via letzplay vs LED display (são o mesmo passo?).
- Onde ficam registrados hoje os dados de capitães/atletas/camisetas (planilha? papel? WhatsApp?).
- Ticket/valores da inscrição e modelo de receita (pra dimensionar patrocínio).
