// index.js — capturador de WhatsApp (roda no SEU PC).
// Lê seu WhatsApp Web via whatsapp-web.js, captura as equipes que os capitães
// mandam no privado, extrai os dados (core.js, sem IA) e gera os arquivos.
//
// Rodar:  npm install  &&  npm start
// Na primeira vez, escaneia o QR code que aparece no terminal com o WhatsApp do celular.

const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const core = require('./core');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'capitaes.json'), 'utf8'));
const DIR_ETAPA = path.resolve(__dirname, '..', 'inscricoes', cfg.etapa);
const DIR_EQUIPES = path.join(DIR_ETAPA, 'equipes');
fs.mkdirSync(DIR_EQUIPES, { recursive: true });

const numerosCapitaes = new Set((cfg.capitaes || []).map((c) => String(c.numero).replace(/\D/g, '')));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox'] },
});

client.on('qr', (qr) => {
  console.log('\n📲 Escaneia esse QR com o WhatsApp do celular (Aparelhos conectados):\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log(`\n✅ Conectado. Ouvindo capitães da etapa "${cfg.etapa}".`);
  console.log(`   Saída em: ${DIR_ETAPA}`);
});

client.on('message', async (msg) => {
  try {
    // só mensagens recebidas em conversa PRIVADA (@c.us), não grupo (@g.us)
    if (!msg.from.endsWith('@c.us')) return;
    const numero = msg.from.replace(/\D/g, '');

    const ehCapitaoConhecido = numerosCapitaes.has(numero);
    const pareceEquipe = /(cat|categoria|sele[çc][aã]o|tamanho|\b[A-E]\b|40\+|60\+)/i.test(msg.body) &&
      msg.body.split(/\r?\n/).filter((l) => l.trim()).length >= 2;

    // se não for capitão cadastrado, só age quando cfg.capturarTodosPrivados = true E parece equipe
    if (!ehCapitaoConhecido && !(cfg.capturarTodosPrivados && pareceEquipe)) return;

    const { selecao, capitao, atletas } = core.parseEquipe(msg.body);

    if (atletas.length === 0) {
      if (ehCapitaoConhecido) {
        await msg.reply(
          'Recebi tua mensagem! Pra eu registrar a equipe certinho, me manda no formato:\n\n' +
          '`1- Nome Completo - categoria - tamanho modelagem`\n' +
          'Ex: `1- João Silva - A - G masc`\n\n' +
          'Categorias: A, B, C, D, E, 40+, 60+ | Tamanhos: PP P M G GG XG'
        );
      }
      return;
    }

    // grava a equipe (arquivo por seleção/numero) e regenera os consolidados
    const nomeArq = (selecao || numero).replace(/[^\w\-]+/g, '_').toLowerCase();
    fs.writeFileSync(
      path.join(DIR_EQUIPES, `${nomeArq}.json`),
      JSON.stringify({ selecao, capitao, numero, recebidoEm: new Date().toISOString(), atletas }, null, 2)
    );
    regenerarConsolidados();

    // responde o capitão com resumo + cobrança do que faltou
    const cobranca = core.mensagemCobranca(capitao, atletas);
    const resumo = `✅ Registrei ${atletas.length} atleta(s) da ${selecao || 'equipe'}.`;
    await msg.reply(cobranca ? `${resumo}\n\n${cobranca}` : `${resumo} Tudo completo, valeu! 🎾`);
    console.log(`→ ${selecao || numero}: ${atletas.length} atletas ${cobranca ? '(com pendências)' : '(completo)'}`);
  } catch (e) {
    console.error('Erro processando mensagem:', e.message);
  }
});

function regenerarConsolidados() {
  const arquivos = fs.readdirSync(DIR_EQUIPES).filter((f) => f.endsWith('.json'));
  const todos = [];
  for (const f of arquivos) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR_EQUIPES, f), 'utf8'));
    todos.push(...d.atletas);
  }
  fs.writeFileSync(path.join(DIR_ETAPA, 'pedido-camisetas.md'), core.gerarPedidoCamisetas(todos, `Etapa ${cfg.etapa} (todas as equipes)`));
  fs.writeFileSync(path.join(DIR_ETAPA, 'bot-inscricao.csv'), core.gerarBotCsv(todos));
}

client.initialize();
