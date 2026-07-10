# AGENTS.md — Guia do repositório

Este repositório contém **dois produtos independentes**. Antes de editar, entenda
em qual você está trabalhando e não misture os dois.

## 1. bt-vision (raiz do repo)
App **Expo / React Native** de análise/scouting (produto de futebol). Código em
`App.tsx`, `src/`, `app.json`, `package.json`. É o app "principal" do repositório
e a branch padrão (`claude/bt-vision-mvp-*`) é dele.

- Rodar: `npm install` && `npm start` (Expo). `npm run web` para navegador.
- Linguagem de UI: pt-BR.

## 2. Canetta (`prototype/` e `canetta/`)
App de **acompanhamento de tratamento GLP-1**. O diretório `prototype/` contém o
protótipo HTML navegável (referência visual/UX). O diretório `canetta/` contém a
implementação real em Next.js + Supabase, construída em fases.

➡️ **Se você vai trabalhar no Canetta, leia primeiro [`prototype/AGENTS.md`](prototype/AGENTS.md).**
Ele traz a visão de produto, as 45 telas, o design system, os **limites
regulatórios obrigatórios** (o app não diagnostica nem prescreve) e a arquitetura
do protótipo.

- Ver o protótipo: abra `prototype/canetta-onboarding.html` no navegador (arquivo
  único, sem build, sem dependências).
- Rodar o app real: entre em `canetta/`, configure `.env.local` a partir de
  `.env.example`, aplique as migrations do Supabase e rode `npm install` +
  `npm run dev`.

## Convenções gerais
- Commits: mensagens claras e descritivas, em pt-BR.
- Não introduza dependências no Canetta sem necessidade — o protótipo é
  intencionalmente self-contained.
- Toda copy de saúde do Canetta deve respeitar os limites descritos em
  `prototype/AGENTS.md` (descrever padrões, nunca recomendar conduta clínica).
