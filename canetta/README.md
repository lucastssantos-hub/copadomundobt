# Canetta MVP

Aplicação mobile-first em Next.js e Supabase para organizar registros informados pela própria pessoa usuária durante uma jornada com GLP-1.

## Escopo entregue

- Onboarding persistente com continuidade entre sessões.
- Uso local sem conta e sincronização por usuário autenticado.
- Registro de aplicação, peso, sintomas, rotina e perguntas.
- Agenda de dose configurável.
- Diário, resumo factual e seleção por período.
- Relatório imprimível em PDF e compartilhamento nativo.
- Exportação completa em JSON.
- Exclusão definitiva da conta e dos dados, com confirmação explícita.
- RLS em todas as tabelas de dados do Canetta.

O app organiza informações registradas pela pessoa usuária. Não diagnostica, prescreve, sugere dose, alimentação ou treino e não calcula peso ideal ou projeção de resultado.

## Configuração

1. Copie `.env.example` para `.env.local` e configure:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

2. Aplique as migrations em ordem:

```text
supabase/migrations/0001_foundation.sql
supabase/migrations/0002_routine_questions.sql
supabase/migrations/0003_mvp_privacy.sql
```

3. Instale e valide:

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

4. Inicie localmente:

```bash
npm run dev
```
