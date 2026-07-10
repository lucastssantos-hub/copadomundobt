# AGENTS.md — Guia do repositório

Este repositório contém **dois produtos independentes**. Antes de editar, entenda
em qual você está trabalhando e não misture os dois.

## 1. bt-vision (raiz do repo)
App **Expo / React Native** de análise/scouting (produto de futebol). Código em
`App.tsx`, `src/`, `app.json`, `package.json`. É o app "principal" do repositório
e a branch padrão (`claude/bt-vision-mvp-*`) é dele.

- Rodar: `npm install` && `npm start` (Expo). `npm run web` para navegador.
- Linguagem de UI: pt-BR.

## 2. Canetta (`prototype/`)
Onboarding de um app de **acompanhamento de tratamento GLP-1**. Hoje existe como um
**protótipo HTML navegável** (design/produto), ainda **não** implementado em código
de app. É um produto diferente do bt-vision — só compartilha o repositório.

➡️ **Se você vai trabalhar no Canetta, leia primeiro [`prototype/AGENTS.md`](prototype/AGENTS.md).**
Ele traz a visão de produto, as 39 telas, o design system, os **limites
regulatórios obrigatórios** (o app não diagnostica nem prescreve) e a arquitetura
do protótipo.

- Ver o protótipo: abra `prototype/canetta-onboarding.html` no navegador (arquivo
  único, sem build, sem dependências).

## Convenções gerais
- Commits: mensagens claras e descritivas, em pt-BR.
- Não introduza dependências no Canetta sem necessidade — o protótipo é
  intencionalmente self-contained.
- Toda copy de saúde do Canetta deve respeitar os limites descritos em
  `prototype/AGENTS.md` (descrever padrões, nunca recomendar conduta clínica).
