// core.js — parsing e geração SEM IA (regex/heurística).
// Funções puras, fáceis de testar. Toda a inteligência "de leitura" mora aqui.

// ---------- Normalizadores ----------

const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

function normalizarTamanho(tokenBruto) {
  if (!tokenBruto) return null;
  const t = tokenBruto.toUpperCase().replace(/[^A-Z]/g, '');
  if (t === 'XGG' || t === 'EXG' || t === 'EXGG') return 'XG';
  return TAMANHOS.includes(t) ? t : null;
}

function normalizarCategoria(tokenBruto) {
  if (!tokenBruto) return null;
  const t = tokenBruto.toUpperCase().replace(/\s+/g, '');
  if (['A', 'B', 'C', 'D', 'E'].includes(t)) return t;
  if (/^\+?40\+?$/.test(t) || t === '40MAIS' || t === 'MAIS40') return '40+';
  if (/^\+?60\+?$/.test(t) || t === '60MAIS' || t === 'MAIS60') return '60+';
  return null;
}

function normalizarModelagem(tokenBruto) {
  if (!tokenBruto) return null;
  const t = tokenBruto.toLowerCase();
  if (/(baby ?look|babylook|\bbaby\b|\bbl\b)/.test(t)) return 'Baby look';
  if (/(fem|mulher|\bf\b)/.test(t)) return 'Feminina';   // fem, feminina, feminino
  if (/(masc|homem|\bm\b)/.test(t)) return 'Masculina';  // masc, masculina, masculino
  return null;
}

// palavras que devem ser ignoradas ao varrer atributos
const RUIDO = new Set(['cat', 'categoria', 'tam', 'tamanho', 'camiseta', 'modelagem', 'camisa']);

// ---------- Parser de uma linha ----------

function ehCabecalho(linha) {
  const l = linha.toLowerCase().trim();
  if (!l) return true;
  if (/^[|\-\s:]+$/.test(l)) return true; // separador de tabela markdown
  return /^(nome da sele|sele[çc][aã]o|etapa|cidade|capit[aã]o|whatsapp|atletas|tamanhos aceitos|modelagem:|categorias:|dados da)/.test(l);
}

function separarDupla(nomeBruto) {
  const partes = nomeBruto
    .split(/\s*(?:\/|&|\+|\se\s)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  return partes.length >= 2 ? partes : [nomeBruto.trim()];
}

function varrerAtributos(resto) {
  // resto = array de trechos após o nome. Varre TODA palavra procurando cat/tam/modelagem.
  let categoria = null, tamanho = null, modelagem = null;
  const tamanhosEncontrados = [];
  for (const trecho of resto) {
    for (const palavra of trecho.split(/\s+/)) {
      const p = palavra.trim();
      if (!p || RUIDO.has(p.toLowerCase())) continue;
      const cat = normalizarCategoria(p);
      if (cat && !categoria) { categoria = cat; continue; }
      const tam = normalizarTamanho(p);
      if (tam) { tamanhosEncontrados.push(tam); if (!tamanho) tamanho = tam; continue; }
      const mod = normalizarModelagem(p);
      if (mod && !modelagem) { modelagem = mod; continue; }
    }
  }
  return { categoria, tamanho, modelagem, tamanhosEncontrados };
}

function parseLinha(linhaBruta) {
  if (ehCabecalho(linhaBruta)) return [];

  // linha de tabela markdown: | 1 | Nome | Cat | Tam | Modelagem |
  if (linhaBruta.trim().startsWith('|')) {
    const c = linhaBruta.split('|').map((x) => x.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    // c = [num?, nome, categoria, tamanho, modelagem] — tolerante a colunas faltando
    const nome = (c[1] || '').trim();
    if (!nome) return [];
    return montarAtletas(nome, {
      categoria: normalizarCategoria(c[2]),
      tamanho: normalizarTamanho(c[3]),
      modelagem: normalizarModelagem(c[4]),
      tamanhosEncontrados: [normalizarTamanho(c[3])].filter(Boolean),
    });
  }

  // texto livre: "1- Nome - cat A - G masc"
  const numerado = /^\s*\d+\s*[-.)º°]\s*/.test(linhaBruta);
  let linha = linhaBruta.replace(/^\s*\d+\s*[-.)º°]\s*/, '').trim();
  if (!linha) return [];
  const partes = linha.split(/\s*[-–|]\s*/).map((s) => s.trim()).filter(Boolean);
  const nomeBruto = (partes.shift() || '').replace(/\(.*?\)/g, '').trim(); // tira "(eu)"
  if (!nomeBruto) return [];
  const attrs = varrerAtributos(partes);
  // porteiro anti-ruído: linha não numerada e sem nenhum atributo reconhecido
  // (categoria/tamanho/modelagem) é saudação/cabeçalho, não atleta.
  const temAtributo = attrs.categoria || attrs.tamanho || attrs.modelagem;
  if (!numerado && !temAtributo) return [];
  return montarAtletas(nomeBruto, attrs);
}

function montarAtletas(nomeBruto, attrs) {
  const nomes = separarDupla(nomeBruto);
  return nomes.map((nome, i) => {
    // numa dupla com dois tamanhos ("G/GG"), distribui em ordem
    const tamanho = nomes.length > 1 && attrs.tamanhosEncontrados.length >= nomes.length
      ? attrs.tamanhosEncontrados[i]
      : (nomes.length === 1 ? attrs.tamanho : null);
    const pendencias = [];
    if (!attrs.categoria) pendencias.push('categoria');
    if (!tamanho) pendencias.push('tamanho');
    return {
      nome,
      categoria: attrs.categoria || null,
      tamanho: tamanho || null,
      modelagem: attrs.modelagem || (tamanho ? 'Masculina' : null),
      modelagemAssumida: !attrs.modelagem && !!tamanho,
      pendencias,
    };
  });
}

// ---------- Parser da mensagem inteira ----------

function parseEquipe(texto) {
  const linhas = texto.split(/\r?\n/);
  let selecao = null, capitao = null;
  const atletas = [];
  for (const linha of linhas) {
    // captura até a vírgula (evita engolir "capitão ..." e o telefone com traço)
    const mSel = linha.match(/sele[çc][aã]o\s*[:\-]?\s*([^,\n]+)/i) || linha.match(/\bequipe\s*[:\-]\s*([^,\n]+)/i);
    if (mSel && !selecao) selecao = mSel[1].trim();
    const mCap = linha.match(/capit[aã]o\s*[:\-]?\s*([^,\n(]+)/i); // para no "(" do telefone
    if (mCap && !capitao) capitao = mCap[1].trim();
    atletas.push(...parseLinha(linha));
  }
  return { selecao, capitao, atletas };
}

// ---------- Geradores de saída ----------

function gerarPedidoCamisetas(atletas, selecao = '') {
  const grade = { Masculina: {}, Feminina: {}, 'Baby look': {} };
  TAMANHOS.forEach((t) => { for (const m of Object.keys(grade)) grade[m][t] = 0; });
  const semTamanho = [], assumidos = [];
  for (const a of atletas) {
    if (a.tamanho && grade[a.modelagem]) grade[a.modelagem][a.tamanho]++;
    else if (!a.tamanho) semTamanho.push(a);
    if (a.modelagemAssumida) assumidos.push(a);
  }
  const cab = `| Modelagem | ${TAMANHOS.join(' | ')} | Total |`;
  const sep = `|${'---|'.repeat(TAMANHOS.length + 2)}`;
  const linhas = Object.entries(grade).map(([m, g]) => {
    const total = TAMANHOS.reduce((s, t) => s + g[t], 0);
    return `| ${m} | ${TAMANHOS.map((t) => g[t]).join(' | ')} | ${total} |`;
  });
  const totalGeral = atletas.filter((a) => a.tamanho).length;
  let md = `# Pedido de camisetas${selecao ? ' — ' + selecao : ''}\n\n${cab}\n${sep}\n${linhas.join('\n')}\n\n**TOTAL confirmado: ${totalGeral} camisetas**\n`;
  if (semTamanho.length) md += `\n## 🔴 Sem tamanho (trava a camiseta)\n` + semTamanho.map((a) => `- ${a.nome}${a.categoria ? ' (cat ' + a.categoria + ')' : ''}`).join('\n') + '\n';
  if (assumidos.length) md += `\n## 🟡 Modelagem assumida (confirmar)\n` + assumidos.map((a) => `- ${a.nome} → assumi Masculina`).join('\n') + '\n';
  return md;
}

function gerarBotCsv(atletas) {
  const esc = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  const linhas = atletas
    .filter((a) => a.nome && a.categoria)
    .map((a) => `${esc(a.nome)},${a.categoria}`);
  return ['nome,categoria', ...linhas].join('\n') + '\n';
}

function mensagemCobranca(capitao, atletas) {
  const semTam = atletas.filter((a) => a.pendencias.includes('tamanho')).map((a) => a.nome);
  const semCat = atletas.filter((a) => a.pendencias.includes('categoria')).map((a) => a.nome);
  if (!semTam.length && !semCat.length) return null;
  let msg = `Fala${capitao ? ' ' + capitao.split(' ')[0] : ''}! Recebi a equipe aqui 👊`;
  if (semTam.length) msg += `\nFaltou o *tamanho da camiseta* de: ${semTam.join(', ')}.`;
  if (semCat.length) msg += `\nE a *categoria* de: ${semCat.join(', ')}.`;
  msg += `\nMe manda que aí garanto que fica tudo certo a tempo. Valeu!`;
  return msg;
}

module.exports = {
  parseEquipe, parseLinha,
  normalizarTamanho, normalizarCategoria, normalizarModelagem,
  gerarPedidoCamisetas, gerarBotCsv, mensagemCobranca, TAMANHOS,
};
