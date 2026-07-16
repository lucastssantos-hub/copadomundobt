#!/usr/bin/env node

/**
 * Letzplay Browser Sync
 * Usa Playwright para acessar a página via headless browser
 * Contorna bloqueios de bot mais efetivamente
 */

import { chromium } from 'playwright';

const tournamentId = process.argv[2] || '61806';
const timeout = 30000; // 30 segundos

async function main() {
  console.log(`\n🌐 Acessando Letzplay com navegador headless...`);
  console.log(`📍 Torneio ID: ${tournamentId}\n`);

  let browser;
  try {
    // Inicia o navegador em modo headless
    browser = await chromium.launch({
      headless: true,
      // Usa o Chromium pré-instalado no ambiente
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Navega para a página
    const url = `https://letzplay.me/circuitoturn/tourneys/${tournamentId}`;
    console.log(`Navegando para: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout });

    // Aguarda o carregamento da página
    await page.waitForTimeout(2000);

    // Procura por vários seletores que podem conter o número de duplas
    const selectors = [
      // Procura por texto contendo números e "dupla/equipe/time"
      'text=/\\d+\\s*(?:dupla|equipe|team|par)/i',
      '[data-testid*="count"]',
      '[data-testid*="pair"]',
      '[class*="inscription"]',
      '[class*="registration"]',
      'span:has-text("dupla")',
      'h1, h2, h3',
    ];

    console.log(`\nProcurando por contadores de duplas...`);

    let foundPairs = null;

    // Tenta extrair informações da página
    const pageContent = await page.content();

    // Procura por padrões de números
    const patterns = [
      /(\d+)\s*(?:duplas?|equipes?|teams?|inscrições?|registr)/gi,
      /total[:\s]*(\d+)/gi,
      /participantes[:\s]*(\d+)/gi,
      /"count"\s*:\s*(\d+)/gi,
      /data-count="(\d+)"/gi,
    ];

    const foundNumbers = new Map();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(pageContent)) !== null) {
        const num = parseInt(match[1], 10);
        if (num > 0 && num < 10000) {
          // Filtra números realistas
          foundNumbers.set(num, (foundNumbers.get(num) || 0) + 1);
        }
      }
    }

    if (foundNumbers.size > 0) {
      // Ordena por frequência
      const sorted = [...foundNumbers.entries()].sort((a, b) => b[1] - a[1]);

      console.log(`\n✅ Números encontrados na página:\n`);
      sorted.slice(0, 10).forEach(([num, count], idx) => {
        const indicator = idx === 0 ? '👉' : '  ';
        console.log(`${indicator} ${num} duplas (aparece ${count}x na página)`);
      });

      foundPairs = sorted[0][0]; // Pega o número mais frequente
    }

    // Tenta também via JavaScript injetado
    const jsResult = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('*'))
        .map((el) => el.textContent)
        .join(' ');

      const match = texts.match(/(\d+)\s*(?:dupla|equipe|team)/i);
      return match ? parseInt(match[1], 10) : null;
    });

    if (jsResult && !foundPairs) {
      foundPairs = jsResult;
      console.log(`\n✅ Encontrado via JavaScript: ${foundPairs} duplas\n`);
    }

    await context.close();

    if (foundPairs) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`📊 RESULTADO: ${foundPairs} DUPLAS INSCRITAS\n`);
      console.log(`Salvando com: npm run letzplay:sync ${tournamentId} -- --pairs ${foundPairs}\n`);

      // Salva automaticamente
      const { execSync } = await import('child_process');
      try {
        execSync(`npm run letzplay:sync ${tournamentId} -- --pairs ${foundPairs}`, {
          stdio: 'inherit',
        });
      } catch (error) {
        console.error('Erro ao salvar:', error.message);
      }
    } else {
      console.log(`\n❌ Não foi possível encontrar o número de duplas na página`);
      console.log(`\n💡 Use: npm run letzplay:discover ${tournamentId}`);
    }
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    console.log(`\nTentativas:\n`);
    console.log(
      `1. npm run letzplay:discover ${tournamentId} (guia interativo)\n`
    );
    console.log(`2. npm run letzplay:sync ${tournamentId} -- --pairs <número>\n`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
