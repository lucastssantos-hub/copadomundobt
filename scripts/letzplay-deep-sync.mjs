#!/usr/bin/env node

/**
 * Letzplay Deep Sync — Tentativa avançada de acesso
 * Usa múltiplas técnicas para contornar bloqueios
 */

import https from 'https';
import http from 'http';

const tournamentId = process.argv[2] || 61806;

console.log(`\n🔍 Sincronização avançada do torneio ${tournamentId}...\n`);

// Diferentes endpoints e estratégias para tentar
const strategies = [
  {
    name: 'API GraphQL',
    url: 'https://api.letzplay.me/graphql',
    method: 'POST',
    body: JSON.stringify({
      query: `{
        tournament(id: ${tournamentId}) {
          id
          name
          totalPairs
          pairs { id team1 team2 }
        }
      }`,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  },
  {
    name: 'API REST v2',
    url: `https://api.letzplay.me/v2/tournaments/${tournamentId}`,
    method: 'GET',
  },
  {
    name: 'API REST v1',
    url: `https://api.letzplay.me/tournaments/${tournamentId}`,
    method: 'GET',
  },
  {
    name: 'Endpoint de dados',
    url: `https://letzplay.me/api/tournaments/${tournamentId}/data`,
    method: 'GET',
  },
  {
    name: 'Endpoint JSON',
    url: `https://letzplay.me/circuitoturn/tourneys/${tournamentId}.json`,
    method: 'GET',
  },
  {
    name: 'Página com sessão simulada',
    url: `https://letzplay.me/circuitoturn/tourneys/${tournamentId}`,
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    },
  },
];

function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', () => {
      resolve({ status: 0, error: true });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: true });
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function tryStrategy(strategy) {
  try {
    console.log(`  Tentando: ${strategy.name}...`);

    const headers = strategy.headers || {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };

    const response = await makeRequest(strategy.url, {
      method: strategy.method || 'GET',
      headers,
      body: strategy.body,
    });

    if (response.status >= 200 && response.status < 300) {
      return { success: true, data: response.body, status: response.status };
    } else if (response.status) {
      console.log(`    ⚠️  HTTP ${response.status}`);
      return { success: false, status: response.status };
    } else {
      console.log(`    ⚠️  Timeout/Erro de conexão`);
      return { success: false };
    }
  } catch (error) {
    console.log(`    ⚠️  ${error.message}`);
    return { success: false };
  }
}

async function main() {
  let found = false;

  for (const strategy of strategies) {
    const result = await tryStrategy(strategy);

    if (result.success) {
      console.log(`\n✅ SUCESSO com: ${strategy.name}\n`);
      console.log('Resposta recebida:');
      console.log('─'.repeat(60));

      if (typeof result.data === 'string') {
        // Se for HTML, procura por números
        const matches = result.data.match(
          /(\d+)\s*(?:duplas?|equipes?|teams?|pares?)/gi
        );
        if (matches) {
          console.log('Padrões encontrados:');
          matches.slice(0, 10).forEach((m) => console.log(`  • ${m}`));
        }

        // Procura por números grandes que possam ser contagens
        const numbers = result.data.match(/\b(\d{2,})\b/g);
        if (numbers) {
          const unique = [...new Set(numbers)].sort((a, b) => b - a);
          console.log('\nNúmeros encontrados (maiores primeiro):');
          unique.slice(0, 15).forEach((n) => console.log(`  • ${n}`));
        }
      } else {
        console.log(JSON.stringify(result.data, null, 2).substring(0, 500));
      }

      console.log('─'.repeat(60));
      found = true;
      break;
    }
  }

  if (!found) {
    console.log('\n❌ Nenhuma estratégia funcionou\n');
    console.log(
      '💡 Alternativas:\n' +
        '   1. Abra em navegador: https://letzplay.me/circuitoturn/tourneys/61806\n' +
        '   2. Inspecione o elemento com o número de duplas\n' +
        '   3. Use: npm run letzplay:sync 61806 -- --pairs <NÚMERO>\n'
    );
  }
}

main().catch(console.error);
