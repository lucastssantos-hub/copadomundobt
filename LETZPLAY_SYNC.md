# Letzplay Sync — Sincronização de Torneios

Ferramenta para sincronizar dados de torneios da plataforma Letzplay com o BT Vision.

## 📋 Uso

### Comando básico

```bash
npm run letzplay:sync <tournament-id>
```

### Exemplos

```bash
# Sincronizar torneio com ID 61806
npm run letzplay:sync 61806

# Se o site bloquear acesso automático, você pode inserir manualmente:
npm run letzplay:sync 61806 -- --pairs 42
```

## 🔧 Como Funciona

1. **Tenta múltiplas estratégias de acesso** à página do torneio
2. **Extrai o número de duplas inscritas** usando expressões regulares
3. **Salva os dados** em JSON em `tournament-data/`
4. **Mostra um relatório** formatado no terminal

## 🔒 Acesso Bloqueado (403 Forbidden)

A Letzplay bloqueia requisições automáticas. Você tem 2 opções:

### Opção 1: Inserir Manualmente

Se você conseguir acessar a página em um navegador:

```bash
npm run letzplay:sync 61806 -- --pairs 42
```

Substituir `42` pelo número real de duplas que você vê na página.

### Opção 2: Integrar com a App

O serviço `src/services/letzplayService.ts` está pronto para ser integrado nas telas do BT Vision:

```typescript
import { letzplayService } from '@services/letzplayService';

const data = await letzplayService.fetchTournamentData(61806);
console.log(`Duplas inscritas: ${data.totalPairs}`);
```

## 📁 Arquivos

- `scripts/letzplay-sync.mjs` — Script CLI principal
- `src/services/letzplayService.ts` — Serviço TypeScript reutilizável
- `tournament-data/` — Histórico de sincronizações (criado automaticamente)

## 🎯 Próximos Passos

- [ ] Integrar widget de sincronização nas telas da app
- [ ] Armazenar dados sincronizados no banco local
- [ ] Criar histórico de inscrições por torneio
- [ ] Notificações quando número de duplas muda
