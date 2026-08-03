# Integração com o Claude — baseada no Anthropic Cookbook

Este app (BT Vision — análise de Beach Tennis) usa a **API do Claude** para gerar
insights táticos em linguagem natural a partir das estatísticas de cada partida,
aplicando padrões do
[Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook).

## O que foi integrado

| Arquivo | Papel |
| --- | --- |
| `src/config/env.ts` | Configuração da API (chave, URL base, modelo) via variáveis `EXPO_PUBLIC_*`. |
| `src/services/claudeService.ts` | Cliente da [Messages API](https://docs.anthropic.com/en/api/messages) do Claude. |
| `src/services/aiService.ts` | `getTacticalInsights()` — chama o Claude com *fallback* para a análise local. |
| `src/screens/ReportScreen.tsx` | Botão "Analisar com Claude" na tela de Relatório. |
| `.env.example` | Modelo de configuração das variáveis de ambiente. |

## Padrões do Cookbook aplicados

1. **JSON mode (saída estruturada)** — Receita
   [*How to enable JSON mode*](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/how_to_enable_json_mode.ipynb).
   Fazemos *prefill* do turno do assistente com `{` para forçar uma saída JSON
   consistente, que é parseada diretamente para o tipo `TacticalInsight[]`.

2. **Prompt engineering** — `system prompt` define o papel ("analista tático de
   Beach Tennis") e as regras (não inventar números, ser acionável). Os dados da
   análise vão estruturados no turno do usuário, junto do schema esperado.

3. **Tratamento de erros e degradação graciosa** — Se a API não estiver
   configurada, falhar na rede, ou retornar erro, o app volta automaticamente
   aos insights calculados localmente (`src/utils/analytics.ts`). A IA nunca
   deixa o relatório vazio.

4. **Validação da saída do modelo** — `category` e `severity` são validados
   contra os valores permitidos antes de renderizar.

## Como configurar

1. Copie `.env.example` para `.env`.
2. Preencha `EXPO_PUBLIC_ANTHROPIC_API_KEY` com sua chave da
   [Anthropic Console](https://console.anthropic.com/).
3. Reinicie o Expo (`npm start`). Na tela de Relatório, toque em
   **"Analisar com Claude"**.

## ⚠️ Segurança — importante para produção

Chamar a API do Claude **direto do app cliente expõe sua chave** — qualquer
pessoa pode extraí-la do bundle. Isso é aceitável apenas para desenvolvimento
local.

Para produção, siga o padrão recomendado:

1. Crie um backend/proxy (ex.: Cloudflare Workers, Vercel, ou um servidor Node)
   que guarde a chave em variável de ambiente **do servidor**.
2. Deixe `EXPO_PUBLIC_ANTHROPIC_API_KEY` vazia no app.
3. Aponte `EXPO_PUBLIC_ANTHROPIC_BASE_URL` para o seu proxy, que encaminha as
   requisições para `https://api.anthropic.com` adicionando o header `x-api-key`.

Assim a chave nunca sai do servidor.

## Referências

- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)
- [Documentação da Messages API](https://docs.anthropic.com/en/api/messages)
- [Guia de prompt engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
