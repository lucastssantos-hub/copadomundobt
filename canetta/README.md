# Canetta App

Aplicação real do Canetta em Next.js + Supabase. O protótipo HTML em
`../prototype` continua sendo referência visual/UX; esta pasta é a base de
produto para implementação em fases.

## Fase 0

Inclui:

- Next.js App Router mobile-first.
- Auth com Supabase.
- Dashboard protegido.
- Perfil inicial persistido por usuário.
- Schema Supabase com RLS para todas as tabelas do handoff.
- Log automático de mudanças em `canetta_journey_state`.
- Tabelas e tipos usam prefixo `canetta_*` para permitir uso temporário em Supabase compartilhado.

## Rodar localmente

1. Crie um projeto Supabase.
2. Rode a migration em `supabase/migrations/0001_foundation.sql`.
3. Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

4. Instale e rode:

```bash
npm install
npm run dev
```

## Travas de produto

O app organiza registros do usuário. Ele não diagnostica, não prescreve, não
sugere dose, horário ideal, alimentação, treino, macro, caloria, peso ideal ou
projeção de perda.
