# Revisão inicial do catálogo essencial

Lote revisado em 2026-07-17: primeiros 30 registros da fila de revisão (`/private/tmp/essential-review-queue.json`). A mídia foi conferida visualmente a partir das imagens CDN baixadas para revisão local.

## Resultado

- Aprovados: 20
- `needs_changes`: 2
- Rejeitados: 8
- Exercícios fora deste lote: 24

## Aprovados

`0741`, `0743`, `1760`, `0534`, `0085`, `1459`, `0196`, `3013`, `0991`, `2144`, `0025`, `0314`, `1456`, `0997`, `0180`, `1320`, `0292`, `0293`, `0153`, `0198`.

O lote cobre candidatos para joelho, quadril, empurrar horizontal, puxar horizontal, puxar vertical e empurrar vertical. A cobertura de `hip_primary` depende da revisão pendente do hip thrust ajoelhado; levantamento romeno foi aprovado como alternativa de quadril.

## Pendentes

- `0046` — agachamento hack com barra: mídia coerente, mas variação menos comum, com setup técnico e necessidade potencial de spotter.
- `3236` — hip thrust ajoelhado com faixa: a mídia parece coerente, porém o nome/execução precisam ser confirmados antes de tratar como `hip_primary`.

## Rejeitados

`2287`, `2611` (unilaterais vinculados ao slot de joelho principal), `1385` (mídia/taxonomia de panturrilha vinculada a joelho), `0989`, `1287`, `1624`, `1012` e `0990` (variações híbridas, especializadas ou inadequadas para o catálogo-base).

## Lacunas restantes

- `knee_flexion`: ainda não revisado neste lote; os candidatos começam no registro 34 da fila.
- `unilateral_lower`: ainda não revisado neste lote; os candidatos começam no registro 37.
- `calf`: ainda não revisado neste lote; os candidatos começam no registro 40.
- `trunk`: ainda não revisado neste lote; os candidatos começam no registro 52.
- `hip_primary`: permanece pendente de confirmação do registro `3236`; há RDL aprovado como alternativa de padrão de quadril.

## Gate de banco

Aplicado em 2026-07-17 no projeto Supabase `copa do mundo` (`llplopgctwaxgnfwzaqi`) via CLI autenticado. Resultado: 20 exercícios revisados e 20 `production_eligible=true`; os 8 rejeitados e 2 `needs_changes` permanecem fora de produção. O catálogo total contém 1.324 exercícios.

Comandos equivalentes para repetir em outro ambiente:

```bash
node scripts/approve-exercise-batch.mjs review.json
npm run authorize:essential-exercises
npm run audit:exercise-coverage
npm run audit:exercise-blocked
```

O script de aprovação agora ignora explicitamente itens `needs_changes` e `rejected`; apenas itens `approved` podem ser atualizados, e todos continuam com `production_eligible = false` até a autorização separada.

## Segunda rodada — acessórios e core

Lote revisado em 2026-07-17 (`review-next.json`), com imagens CDN conferidas visualmente para os candidatos aprovados.

- Aprovados e autorizados: `0178`, `0192`, `0977`, `0382`, `0868`, `0417`, `0999`, `0306`, `0998`, `0979`, `1015`, `3544`.
- Mantidos como `needs_changes`: `0809`, `3236`, `0046`.
- Os itens híbridos/unilaterais já rejeitados permanecem bloqueados.

Cobertura elegível após a rodada: accessory 3, biceps 2, calf 2, hip_primary 2, hip_secondary 3, horizontal_pull 4, horizontal_push 3, knee_primary 2, knee_secondary 2, triceps 2, trunk 3, vertical_pull 2 e vertical_push 2. `knee_flexion` e `unilateral` continuam sem exercícios liberados para não introduzir candidatos de maior complexidade sem revisão específica.

## Terceira rodada — joelho, panturrilha e puxada

Lote revisado em 2026-07-17 (`review-round3.json`), novamente com conferência visual das imagens.

- Aprovados e autorizados: `1000` (panturrilha reversa), `0585` (extensão de joelho na máquina), `3007` (extensão de joelho com faixa) e `0197` (puxada frontal com barra longa).
- `needs_changes`: `0496`, `3235` (flexões nórdicas assistidas), `0987` e `1001` (agachamentos divididos com faixa).
- Rejeitados: `1769` (variação incomum de bíceps) e `1417` (flexão unilateral na bola com complexidade excessiva).

O catálogo agora tem 36 exercícios elegíveis. `knee_flexion` e `unilateral` seguem deliberadamente em zero até uma rodada específica de validação profissional desses movimentos.

## Quarta rodada — flexão de joelho assistida

O único candidato liberado foi `3235`, flexão nórdica reversa assistida no cabo. A taxonomia foi corrigida para `knee_flexion`, e o exercício ficou restrito a `treino_regular`; não é opção para iniciantes.

`0496` permanece pendente por setup menos claro. `0987` e `1001` permanecem pendentes por demanda de equilíbrio. O catálogo passou para 37 exercícios elegíveis, com 1 opção de knee_flexion e nenhum unilateral liberado.

## Quinta rodada — catálogo geral

Para ampliar a variedade, a fila essencial foi complementada com sete exercícios comuns do catálogo geral, todos com mídia conferida:

- `0586` flexão de joelho deitado na máquina
- `0599` flexão de joelho sentado na máquina
- `0861` remada sentada no cabo
- `0576` chest press na máquina
- `1299` chest press inclinado na máquina
- `1350` remada sentada na máquina
- `1409` ponte de glúteos com barra

Todos foram traduzidos, classificados e autorizados no Supabase. O catálogo passou para 44 exercícios elegíveis, com 3 opções de `knee_flexion`, 6 de `horizontal_pull`, 5 de `horizontal_push` e 4 de `hip_secondary`. `unilateral` continua sem liberação automática.

## Sexta rodada — máquinas e puxadas

Foram adicionados seis exercícios estáveis do catálogo geral, com conferência visual:

- `0579` puxada frontal na máquina
- `0673` puxada frontal na máquina com pegada reversa
- `0739` leg press a 45 graus
- `1391` elevação de panturrilha no leg press
- `2736` puxada frontal na máquina com pegada supinada
- `3523` ponte de glúteos com os pés no banco

O catálogo passou para 50 exercícios elegíveis, com 6 opções de `vertical_pull`, 3 de `knee_primary`, 4 de `calf` e 5 de `hip_secondary`. A puxada alta em pé (`2330`) ficou pendente por exigir instrução adicional.

## Sétima rodada — presses e remadas

Foram liberadas sete alternativas de academia, todas com mídia conferida:

- `0151` supino no cabo
- `0239` remada sentada no cabo com costas retas
- `0289` supino reto com halteres (com spotter)
- `0588` remada sentada na máquina com pegada fechada
- `0748` supino reto no smith
- `0757` supino inclinado no smith
- `1323` remada sentada com corda no cabo

O catálogo passou para 57 exercícios elegíveis, com 9 opções de `horizontal_pull` e 9 de `horizontal_push`. As opções com halteres/smith foram marcadas para usuários com experiência adequada.

## Oitava rodada — variações de cabo e máquina

Foram adicionados seis exercícios:

- `0169` supino inclinado no cabo
- `0571` remada sentada na máquina com pegada alternada
- `0751` supino fechado no smith (slot tríceps)
- `1300` chest press declinado na máquina
- `1301` chest press interno na máquina
- `1321` remada sentada elevada com corda

O catálogo passou para 63 exercícios elegíveis, com 11 opções de `horizontal_pull`, 12 de `horizontal_push` e 3 de `triceps`.

## Nona rodada — posterior de coxa

Foi liberada uma nova opção de máquina:

- `3195` flexão de joelho deitado unilateral na máquina, restrita a usuários com experiência adequada.

`1766` ficou pendente por exigir controle nórdico autoassistido. `3562` foi rejeitado por duplicar a ponte de glúteos já existente. O catálogo passou para 64 exercícios elegíveis, com 4 opções de `knee_flexion`.

## Décima rodada — acessórios de cabo

Foram adicionados cinco acessórios com mídia conferida:

- `0148` desenvolvimento alternado de ombros no cabo
- `0149` extensão alternada de tríceps no cabo
- `0165` rosca martelo no cabo com corda
- `0194` extensão de tríceps acima da cabeça no cabo
- `0195` rosca Scott no cabo

O catálogo passou para 69 exercícios elegíveis, com 4 opções de bíceps, 5 de tríceps e 3 de desenvolvimento vertical.

## Décima primeira rodada — core/tronco

Foram adicionados três exercícios simples:

- `0212` abdominal sentado no cabo
- `0276` dead bug
- `0595` abdominal sentado na máquina

O catálogo passou para 72 exercícios elegíveis, com 6 opções de `trunk`. A combinação de agachamento na parede com flexão lateral (`0691`) ficou pendente por ser híbrida.
