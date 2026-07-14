// test.js — valida o parser SEM IA com uma mensagem bagunçada de WhatsApp.
const core = require('./core');

const msg = `Fala Lucas! Seleção Tubarões de Maringá, capitão Rafael (44 99999-0000)
1- João Pedro Silva - cat A - G masc
2- Marcos Antônio - A - GG
3- Bruna Costa - B - P feminina
4- Carla Menezes - B - M babylook
5- Rafael Souza (eu) - C - G
6- Tiago Lima - C
7- Fernanda Dias - D - M fem
8- Roberto Alves - 40+ - GG masc
9- Sérgio e Paulo - 60+`;

const r = core.parseEquipe(msg);
console.log('Seleção:', r.selecao);
console.log('Capitão:', r.capitao);
console.log('Atletas:', r.atletas.length);
console.table(r.atletas.map((a) => ({
  nome: a.nome, cat: a.categoria, tam: a.tamanho, modelagem: a.modelagem,
  pend: a.pendencias.join('/') || '-',
})));
console.log('\n--- PEDIDO DE CAMISETAS ---');
console.log(core.gerarPedidoCamisetas(r.atletas, r.selecao));
console.log('--- bot-inscricao.csv ---');
console.log(core.gerarBotCsv(r.atletas));
