# MVP: Evolução de Alunos — pivô do BT Vision

> Decisão baseada na validação com o fundador (professor de beach tennis, usuário nº 1).
> Complementa `pesquisa-dores-beach-tennis.md` e `plano-validacao.md`.

## 1. O que a validação com o fundador mostrou

| Pergunta | Resposta | Implicação |
|---|---|---|
| Nº de alunos | **60+** | Volume real; gestão manual não escala |
| Modelo de cobrança | Mensalidade fixa + via arena | Cobrança **não** é a dor nº 1 (a arena absorve parte) |
| Perda estimada/mês | **R$ 300–800** | Critério "verde" do plano de validação atingido |
| Dor nº 1 | **Evolução dos alunos** | Redesenhar o MVP em torno disso |
| Objetivo da evolução | **Planejar treinos** | O output principal é "o que treinar na próxima aula" |
| Registro hoje | Caderno/planilha | Substituição direta, sem concorrente de software |
| O que o aluno deve ver | **Avaliação por fundamento** | Notas por fundamento ao longo do tempo (radar/tendência) |

**Ressalva metodológica (n=1):** o fundador cobra via arena — professores 100% autônomos podem priorizar cobrança. Manter as 5–10 entrevistas com colegas do `plano-validacao.md`, agora testando as duas hipóteses: *evolução/planejamento* vs *cobrança/agenda*. Se colegas confirmarem evolução, dobrar a aposta; se priorizarem cobrança, o produto vira "evolução primeiro, cobrança no ato 2".

## 2. Tese do produto

**De:** BT Vision — app de análise/scout de partidas (análise é o centro; atleta é um nome dentro da análise).
**Para:** Diário de evolução do professor — **o aluno é o centro**; cada treino/scout/avaliação alimenta a linha do tempo do aluno; o app devolve o plano da próxima aula.

Loop central do professor:
1. Dá aula → faz **avaliação rápida por fundamento** (30s por aluno) ou scout completo (já existe).
2. App consolida a evolução do aluno (radar por fundamento + tendência).
3. App aponta os fundamentos mais fracos **da turma** → sugere foco/drills da próxima aula.
4. Aluno recebe link com sua evolução → percebe progresso → renova (retenção).

## 3. O que já existe no código e o que falta

| Peça | Status | Observação |
|---|---|---|
| Captura de eventos por fundamento (`ScoutEvent`, 12 tipos) | ✅ Existe | Base da avaliação objetiva |
| Relatório por análise (`AnalysisReport`, `PlayerStats`) | ✅ Existe | Hoje morre na análise; precisa agregar por aluno |
| PDF/compartilhamento | ✅ Existe | Reaproveitar para o "boletim do aluno" |
| **Aluno persistente** (entidade própria, cross-análises) | ❌ Falta | Hoje `Athlete` vive dentro de uma `Analysis` |
| **Turmas** (grupo, horário, nível) | ❌ Falta | Unidade de planejamento de treino |
| **Avaliação por rubrica** (nota 1–5 por fundamento, sem vídeo) | ❌ Falta | O caminho rápido pós-aula; scout completo vira o modo "premium" |
| **Linha do tempo/radar de evolução por aluno** | ❌ Falta | Agregação das avaliações + scouts no tempo |
| **Planejador de treino** (fraquezas da turma → sugestão de foco) | ❌ Falta | v1 pode ser heurística simples, sem IA |
| **Link do aluno** (visão read-only da própria evolução) | ❌ Falta | v1 pode ser o PDF já existente enviado no WhatsApp |

## 4. Escopo do MVP (congelado)

1. **Cadastro de alunos e turmas** — aluno persistente com nível, turma(s), observações.
2. **Avaliação rápida pós-aula** — rubrica 1–5 nos fundamentos existentes do `ScoutEventType` agrupados em 6 eixos: saque, devolução, ataque (smash/ataque), defesa (lob/defesa/recuperação), tático (pressão/cobertura/neutro), consistência (winners vs erros). Máx. 30s por aluno.
3. **Perfil de evolução do aluno** — radar atual + tendência por eixo + histórico de avaliações e scouts vinculados.
4. **Painel da turma** — média por eixo, alunos destoando (muito acima/abaixo = candidato a trocar de turma), 2 eixos mais fracos = foco sugerido da próxima aula.
5. **Boletim do aluno** — PDF/imagem compartilhável no WhatsApp (reusa `pdfService`), com marca do professor.

**Fora do MVP:** cobrança, agenda/reposição, matchmaking/rating público, IA de vídeo, multi-professor. Anotar demanda, não construir.

## 5. Migração de dados (direção técnica)

- Nova entidade `Student` (id, nome, nível, turmas, contato) em storage local (AsyncStorage via `storageService`, como hoje).
- `Athlete.side` continua para o scout; `Athlete` ganha `studentId?` opcional para vincular análise → aluno.
- Nova entidade `Assessment` (id, studentId, date, scores: Record<eixo, 1–5>, note).
- `ClassGroup` (id, nome, horário, dias, nível, studentIds).
- Evolução = merge cronológico de `Assessment` + `PlayerStats` derivados de análises vinculadas.

## 6. Sequência de construção sugerida

1. Entidades + telas de Alunos e Turmas (CRUD).
2. Avaliação rápida (fluxo pós-aula: turma → lista de alunos → rubrica em 1 tela).
3. Perfil do aluno com radar/tendência (react-native-svg já está no projeto).
4. Painel da turma + foco sugerido.
5. Boletim compartilhável.
6. Vincular scout existente ao aluno (fecha o ciclo com o BT Vision original).

## 7. Métrica de sucesso do MVP

- Fundador usa em **100% das turmas por 2 semanas** sem voltar ao caderno.
- 3 alunos recebem o boletim e reagem ("adoraram" = sinal de retenção).
- 2 professores colegas pedem acesso depois de ver o boletim/painel → início da lista beta.
