# Letzplay Sync — Sincronização de Torneios

Ferramenta completa para sincronizar dados de torneios da plataforma Letzplay com o BT Vision.

⚠️ **Nota:** A Letzplay bloqueia requisições automáticas. Use as opções abaixo para descobrir o número real de duplas.

## 🚀 Comandos Disponíveis

### 1. **Discover** — Guia Interativo (Recomendado)

```bash
npm run letzplay:discover 61806
```

Abre um assistente passo-a-passo que:
- Mostra a URL para abrir em seu navegador
- Instrui onde procurar o número de duplas
- Registra automaticamente o valor inserido

### 2. **Sync** — Sincronizar Manualmente

```bash
npm run letzplay:sync 61806 -- --pairs 256
```

Registra um número específico de duplas:
- `61806` → ID do torneio
- `256` → Número de duplas inscritas (verificar na página)

Salva dados em `tournament-data/tournament_61806_*.json`

### 3. **Verify** — Tentativa Automática

```bash
npm run letzplay:verify 61806
```

Tenta acessar a página com múltiplos headers e estratégias. Se conseguir, extrai o número automaticamente.

### 4. **Deep Sync** — Análise Profunda

```bash
npm run letzplay:deep 61806
```

Tenta acessar via:
- API GraphQL
- API REST (v1 e v2)
- Endpoints alternativos
- Acesso direto com headers

## 📋 Passo-a-Passo Recomendado

### 1. Abra a página em seu navegador

```
https://letzplay.me/circuitoturn/tourneys/61806
```

### 2. Procure pelo número de duplas

Procure por:
- Um badge/card com "X duplas inscritas"
- Uma seção de "Inscrições"
- Uma tabela listando equipes/duplas
- Um contador no topo da página

### 3. Registre o número com um dos comandos

```bash
# Opção A: Guia interativo (mais fácil)
npm run letzplay:discover 61806

# Opção B: Inserir diretamente
npm run letzplay:sync 61806 -- --pairs 256
```

## 🔧 Como Funciona

### letzplayService.ts

Serviço TypeScript reutilizável para integrar nas telas:

```typescript
import { letzplayService } from '@services/letzplayService';

const data = await letzplayService.fetchTournamentData(61806);
console.log(`Duplas inscritas: ${data.totalPairs}`);
console.log(letzplayService.formatTournamentReport(data));
```

## 📁 Arquivos do Projeto

| Arquivo | Descrição |
|---------|-----------|
| `scripts/letzplay-sync.mjs` | CLI para sincronizar dados |
| `scripts/letzplay-discover.mjs` | Assistente interativo |
| `scripts/letzplay-verify.sh` | Tentativa automática (curl) |
| `scripts/letzplay-deep-sync.mjs` | Análise de múltiplos endpoints |
| `scripts/letzplay-browser.mjs` | Headless browser (Playwright) |
| `src/services/letzplayService.ts` | Serviço TypeScript |
| `tournament-data/` | Histórico de sincronizações |

## 💾 Formato dos Dados Salvos

```json
{
  "id": 61806,
  "name": "Circuito TURN",
  "totalPairs": 256,
  "detectedFrom": "entrada manual",
  "fetchedAt": "2026-07-15T18:16:06.776Z"
}
```

## 🎯 Próximas Melhorias

- [ ] Integrar widget de sincronização nas telas da app
- [ ] Armazenar dados sincronizados no banco local (AsyncStorage)
- [ ] Criar histórico de inscrições por torneio
- [ ] Notificações quando número de duplas muda
- [ ] Sincronização periódica automática
- [ ] Cache local com validação de timestamp
