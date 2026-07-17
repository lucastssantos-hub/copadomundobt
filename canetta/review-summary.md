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
