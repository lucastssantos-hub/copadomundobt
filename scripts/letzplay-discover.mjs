#!/usr/bin/env node

/**
 * Letzplay Discover — Assistente interativo
 * Ajuda a descobrir o número exato de duplas no torneio
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   LETZPLAY DISCOVER                        ║
║         Descubra o número exato de duplas inscritas        ║
╚════════════════════════════════════════════════════════════╝
  `);

  const tournamentId = process.argv[2] || '61806';

  console.log(`\n📋 Torneio ID: ${tournamentId}`);
  console.log(`\nPor favor, siga estes passos:\n`);

  console.log(
    `1️⃣  Abra esta URL em seu navegador (Google Chrome, Firefox, Safari):\n`
  );
  console.log(
    `   🔗 https://letzplay.me/circuitoturn/tourneys/${tournamentId}\n`
  );

  console.log(`2️⃣  Procure por uma das seguintes informações na página:\n`);
  console.log(`   • Um card/badge com "X duplas inscritas"`);
  console.log(`   • Uma seção de "Inscrições" com contador`);
  console.log(`   • Uma tabela listando os times/duplas`);
  console.log(`   • Um número grande destacado no topo da página\n`);

  console.log(`3️⃣  Aperte F12 ou Ctrl+Shift+I para abrir o DevTools`);
  console.log(`   • Vá até a aba "Elements" ou "Inspector"`);
  console.log(
    `   • Procure por texto contendo "dupla", "equipe", "teams", etc\n`
  );

  const answer = await question(
    `\n✍️  Quantas duplas você vê inscritas? (Digite o número): `
  );

  const pairs = parseInt(answer.trim(), 10);

  if (isNaN(pairs) || pairs <= 0) {
    console.log(`\n❌ Número inválido! Use um número inteiro positivo.`);
    process.exit(1);
  }

  console.log(`\n📊 Número de duplas confirmado: ${pairs}\n`);

  // Agora salva esse dado
  const command = `npm run letzplay:sync ${tournamentId} -- --pairs ${pairs}`;

  console.log(`Salvando dados...\n`);
  console.log(`Execute este comando para registrar os dados:\n`);
  console.log(`   ${command}\n`);

  console.log(`Ou use este código em sua app:\n`);
  console.log(`   const tournamentData = {`);
  console.log(`     id: ${tournamentId},`);
  console.log(`     totalPairs: ${pairs},`);
  console.log(`     fetchedAt: new Date().toISOString()`);
  console.log(`   };\n`);

  rl.close();
}

main().catch(console.error);
