# Canetta — auditoria UI/UX Pro Max

Escopo: app autenticado, com foco em `/journey` e nos fluxos de registro.
Data: 2026-07-18.

## Resultado por prioridade

| Prioridade | Categoria | Estado atual | Próxima ação |
|---|---|---|---|
| 1 | Acessibilidade | Parcialmente atendida | Associar `label`/`htmlFor` a todos os campos, revisar foco em sheets e substituir estados comunicados apenas por cor. |
| 2 | Toque e interação | Em andamento | A base agora garante 44 px para botões e preserva o mapa corporal com alvo visual próprio; revisar controles compactos de água/peso na próxima rodada. |
| 3 | Performance | Boa base | Manter `loading="lazy"` nos GIFs/imagens, reservar dimensões, observar bundle da jornada e evitar carregar dados abaixo da dobra sem necessidade. |
| 4 | Seleção de estilo | Em andamento | A navegação e os registros rápidos agora usam identificadores visuais consistentes em vez de emojis; próxima evolução: ícones SVG/Lucide ou Phosphor. |
| 5 | Layout e responsividade | Parcialmente atendida | Testar 375, 768, 1024 e 1440 px; preservar safe-area, evitar scroll aninhado e manter a divulgação progressiva da tela Hoje. |
| 6 | Tipografia e cor | Em andamento | Componentes reutilizados agora usam tokens semânticos; ainda falta migrar estilos inline restantes e medir textos secundários em cada superfície. |
| 7 | Animação | Boa base | Manter transições de 150–300 ms e redução de movimento. Evitar animação decorativa além do mascote e de mudanças de estado. |
| 8 | Formulários e feedback | Parcialmente atendida | Manter o quiz em cascata, adicionar helper text persistente e validar campos próximos ao erro com caminho de recuperação. |
| 9 | Navegação | Parcialmente atendida | A navegação principal tem até 5 destinos; manter back previsível nos fluxos e evoluir `/journey`/subseções para deep links quando necessário. |
| 10 | Dados e gráficos | Ainda não aplicável | Quando houver tendência com ≥4 pontos, usar linha/área com tabela acessível, legenda, unidades e alternativa textual. Para poucos pontos, manter cartões factuais. |

## Decisões de produto

- A superfície é uma app de saúde: clareza, contraste, segurança e confiança têm prioridade sobre decoração.
- O “Hoje” mostra a próxima ação; detalhes ficam sob divulgação progressiva.
- O check-in nutricional permanece em etapas curtas, com voltar, progresso e explicação para “Ainda não sei”.
- O Canetta organiza dados relatados; não cria metas clínicas automaticamente.
- Gráficos só entram quando houver dados suficientes para uma tendência real.

## Checklist de aceite

- [ ] Todos os campos têm label programático e helper text quando necessário.
- [ ] Todos os controles interativos têm nome acessível, foco visível e alvo mínimo de 44 px.
- [ ] Nenhuma informação depende apenas de cor.
- [ ] GIFs/imagens têm dimensões reservadas, `alt` e carregamento lazy.
- [ ] Fluxos têm cancelamento e retorno sem perder o rascunho.
- [ ] Testado em 375 px e em orientação paisagem.
- [ ] `prefers-reduced-motion` não bloqueia conteúdo.
- [ ] Dados temporais têm alternativa textual antes de qualquer gráfico.
