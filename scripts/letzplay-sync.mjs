#!/usr/bin/env node

/**
 * Letzplay Sync CLI
 * Sincroniza dados de torneios da Letzplay
 *
 * Uso:
 *   npm run letzplay:sync <tournament-id>
 *   node scripts/letzplay-sync.mjs 61806
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fetchTournamentData(tournamentId, options = {}) {
  const baseUrl = 'https://letzplay.me';
  const url = `${baseUrl}/circuitoturn/tourneys/${tournamentId}`;

  console.log(`\n🔄 Sincronizando dados do torneio ${tournamentId}...`);
  console.log(`📍 URL: ${url}\n`);

  // Tenta múltiplas estratégias de acesso
  const strategies = [
    {
      name: 'Acesso direto com headers de navegador',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
    },
    {
      name: 'Acesso com referer',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://letzplay.me/',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    },
    {
      name: 'Acesso com headers customizados',
      headers: {
        'User-Agent': 'BT-Vision-App/1.0',
        'Accept': 'text/html',
      },
    },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`Tentativa: ${strategy.name}...`);

      const response = await fetch(url, {
        headers: strategy.headers,
        redirect: 'follow',
      });

      if (response.ok) {
        const html = await response.text();
        const tournamentData = parseTournamentData(html, tournamentId);
        displayReport(tournamentData);
        return tournamentData;
      } else if (response.status === 403) {
        console.log(`  ⚠️  403 Forbidden com essa estratégia\n`);
      } else {
        console.log(`  ⚠️  HTTP ${response.status}\n`);
      }
    } catch (error) {
      console.log(`  ⚠️  Erro: ${error.message}\n`);
    }
  }

  // Se todas as estratégias falharem
  console.error('❌ Nenhuma estratégia funcionou');
  console.error(
    '\n📌 Possíveis causas:\n' +
      '   • A Letzplay pode estar bloqueando requisições de bots\n' +
      '   • O torneio pode ser privado/protegido\n' +
      '   • A página pode exigir autenticação\n'
  );

  console.error(
    'ℹ️  Alternativas:\n' +
      '   1. Abra a URL em um navegador para verificar o acesso manual\n' +
      '   2. Se exigir login, você pode precisar de credenciais\n' +
      '   3. Verifique se o ID do torneio está correto\n'
  );

  displayManualAccessGuide(url);
  process.exit(1);
}

function parseTournamentData(html, tournamentId) {
  // Procura pelo padrão de contagem de duplas
  const pairsPatterns = [
    /(\d+)\s*(?:duplas?|equipes?)/gi,
    /(?:total|count|inscritas?)\s*[:\-]?\s*(\d+)/gi,
    /<span[^>]*>(\d+)<\/span>\s*(?:dupla|equipe)/gi,
    /data-pairs="(\d+)"/gi,
  ];

  let totalPairs = 0;
  let detectedFrom = 'padrão não identificado';

  // Tenta cada padrão
  for (const pattern of pairsPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      // Extrai números de todas as matches e pega o maior
      const numbers = matches
        .map((m) => {
          const num = parseInt(m.replace(/\D/g, ''), 10);
          return isNaN(num) ? 0 : num;
        })
        .filter((n) => n > 0);

      if (numbers.length > 0) {
        totalPairs = Math.max(...numbers);
        detectedFrom = pattern.toString().slice(0, 30);
        break;
      }
    }
  }

  // Extrai nome do torneio
  let name = 'Circuito TURN';
  const namePatterns = [
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<h2[^>]*>([^<]+)<\/h2>/i,
    /<title>([^<]+)<\/title>/i,
    /"title"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of namePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }

  return {
    id: tournamentId,
    name: name,
    totalPairs: totalPairs,
    detectedFrom: detectedFrom,
    fetchedAt: new Date().toISOString(),
  };
}

function displayReport(data) {
  const divider = '═'.repeat(60);

  console.log(divider);
  console.log(`\n✅ SINCRONIZAÇÃO CONCLUÍDA\n`);
  console.log(`📋 Torneio: ${data.name}`);
  console.log(`🆔 ID: ${data.id}`);
  console.log(`\n👥 DUPLAS INSCRITAS: ${data.totalPairs}`);
  console.log(`\n⏰ Atualizado em: ${new Date(data.fetchedAt).toLocaleString('pt-BR')}`);
  console.log(`\n${divider}\n`);

  // Salva os dados em JSON
  const filename = `tournament_${data.id}_${Date.now()}.json`;
  const dataDir = path.join(__dirname, '..', 'tournament-data');
  const outputPath = path.join(dataDir, filename);

  try {
    // Cria diretório se não existir
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`📁 Dados salvos em: tournament-data/${filename}\n`);
  } catch (error) {
    console.warn(`⚠️  Não foi possível salvar arquivo: ${error.message}\n`);
  }
}

function displayManualAccessGuide(url) {
  const divider = '═'.repeat(60);
  console.log(`\n${divider}`);
  console.log('\n🔗 GUIA DE ACESSO MANUAL\n');
  console.log(`Abra esta URL no seu navegador:\n  ${url}\n`);
  console.log(
    'Depois, você pode:\n' +
      '  1. Copiar o número de duplas da página\n' +
      '  2. Usar o comando com a opção --pairs:\n' +
      `     npm run letzplay:sync 61806 -- --pairs 42\n`
  );
  console.log(divider);
  console.log('');
}

// Main
const tournamentId = process.argv[2];
const pairsArg = process.argv.includes('--pairs')
  ? parseInt(process.argv[process.argv.indexOf('--pairs') + 1], 10)
  : null;

if (!tournamentId) {
  console.error('❌ Erro: ID do torneio não fornecido');
  console.error('\nUso: npm run letzplay:sync <tournament-id>');
  console.error('Exemplo: npm run letzplay:sync 61806\n');
  process.exit(1);
}

if (isNaN(tournamentId)) {
  console.error('❌ Erro: ID deve ser um número');
  process.exit(1);
}

// Se o usuário passou manualmente o número de duplas
if (pairsArg !== null) {
  console.log(`\n✅ Número de duplas registrado manualmente: ${pairsArg}\n`);
  displayReport({
    id: parseInt(tournamentId, 10),
    name: 'Circuito TURN',
    totalPairs: pairsArg,
    detectedFrom: 'entrada manual',
    fetchedAt: new Date().toISOString(),
  });
} else {
  fetchTournamentData(parseInt(tournamentId, 10));
}
