export const CATEGORIES = ['A', 'B', 'C', 'D', 'E', '+35', '+60'];

// Keep old exports for backward compat with components that haven't been updated yet
export const MATCH_STATUS = {
  WAITING_LINEUP: 'waiting_lineup',
  LINEUP_SENT: 'lineup_sent',
  WARMING_UP: 'warming_up',
  IN_PROGRESS: 'in_progress',
  WAITING_RESULT: 'waiting_result',
  FINISHED: 'finished',
};

export const MATCH_STATUS_LABELS = {
  waiting_lineup: 'Aguardando Escalação',
  lineup_sent: 'Escalação Enviada',
  warming_up: 'Em Aquecimento',
  in_progress: 'Em Jogo',
  waiting_result: 'Aguardando Resultado',
  finished: 'Finalizado',
};

export const MATCH_STATUS_COLORS = {
  waiting_lineup: 'bg-gray-100 text-gray-600',
  lineup_sent: 'bg-yellow-100 text-yellow-700',
  warming_up: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-green-100 text-green-700',
  waiting_result: 'bg-blue-100 text-blue-700',
  finished: 'bg-slate-100 text-slate-600',
};

// ─── Round-robin jogo generator ───────────────────────────────────────────────
let _jogoCounter = 0;

export function gerarJogos(eqs) {
  const jogos = [];
  for (let i = 0; i < eqs.length; i++) {
    for (let j = i + 1; j < eqs.length; j++) {
      _jogoCounter++;
      jogos.push({
        id: `j${_jogoCounter}`,
        e1: eqs[i].id,
        e2: eqs[j].id,
        catId: eqs[i].catId,
        grupo: eqs[i].grupo,
        gnome: `${eqs[i].grupo}`,
        bloq: false,
        quadra: null,
        esc: null,
        timerInicio: null,
        res: null,
        det: null,
        venc: null,
      });
    }
  }
  return jogos;
}

// ─── Result status calculator ─────────────────────────────────────────────────
export function calcResultStatus(jogo) {
  if (!jogo.det) return { done: false, needMX: false };
  const det = jogo.det;
  const fd = det.fd1 != null && det.fd2 != null
    ? { s1: det.fd1, s2: det.fd2, winner: det.fd1 > det.fd2 ? jogo.e1 : det.fd2 > det.fd1 ? jogo.e2 : null }
    : null;
  const md = det.md1 != null && det.md2 != null
    ? { s1: det.md1, s2: det.md2, winner: det.md1 > det.md2 ? jogo.e1 : det.md2 > det.md1 ? jogo.e2 : null }
    : null;
  let e1wins = 0, e2wins = 0;
  if (fd?.winner === jogo.e1) e1wins++; else if (fd?.winner === jogo.e2) e2wins++;
  if (md?.winner === jogo.e1) e1wins++; else if (md?.winner === jogo.e2) e2wins++;
  const needMX = fd && md && fd.winner && md.winner && e1wins === 1 && e2wins === 1;
  const mx = needMX && det.mx1 != null
    ? { s1: det.mx1, s2: det.mx2, winner: det.mx1 > det.mx2 ? jogo.e1 : jogo.e2 }
    : null;
  if (needMX && mx?.winner === jogo.e1) e1wins++;
  else if (needMX && mx?.winner === jogo.e2) e2wins++;
  const done = e1wins >= 2 || e2wins >= 2;
  const winner = done ? (e1wins > e2wins ? jogo.e1 : jogo.e2) : null;
  const res = done ? `${e1wins}-${e2wins}` : null;
  return { fd, md, mx, e1wins, e2wins, needMX: !!needMX, done, winner, res };
}

// ─── Teams ────────────────────────────────────────────────────────────────────
const eqsCatA = [
  { id: 'bra', nome: 'Brasil',    catId: 'A', grupo: 1, bandeira: '🇧🇷' },
  { id: 'arg', nome: 'Argentina', catId: 'A', grupo: 1, bandeira: '🇦🇷' },
  { id: 'por', nome: 'Portugal',  catId: 'A', grupo: 1, bandeira: '🇵🇹' },
  { id: 'esp', nome: 'Espanha',   catId: 'A', grupo: 2, bandeira: '🇪🇸' },
  { id: 'ita', nome: 'Itália',    catId: 'A', grupo: 2, bandeira: '🇮🇹' },
  { id: 'fra', nome: 'França',    catId: 'A', grupo: 2, bandeira: '🇫🇷' },
];

const eqsCatB = [
  { id: 'eua', nome: 'EUA',       catId: 'B', grupo: 1, bandeira: '🇺🇸' },
  { id: 'aus', nome: 'Austrália', catId: 'B', grupo: 1, bandeira: '🇦🇺' },
  { id: 'col', nome: 'Colômbia',  catId: 'B', grupo: 1, bandeira: '🇨🇴' },
  { id: 'chi', nome: 'Chile',     catId: 'B', grupo: 2, bandeira: '🇨🇱' },
  { id: 'mex', nome: 'México',    catId: 'B', grupo: 2, bandeira: '🇲🇽' },
  { id: 'uru', nome: 'Uruguai',   catId: 'B', grupo: 2, bandeira: '🇺🇾' },
];

// ─── Athletes ─────────────────────────────────────────────────────────────────
function makeAtletas(eqId, catId, prefix, mNames, fNames) {
  const atls = [];
  mNames.forEach((nome, i) => atls.push({ id: `${eqId}-m${i+1}`, eqId, catId, nome, sexo: 'M' }));
  fNames.forEach((nome, i) => atls.push({ id: `${eqId}-f${i+1}`, eqId, catId, nome, sexo: 'F' }));
  return atls;
}

const atlsCatA = [
  ...makeAtletas('bra', 'A', 'bra', ['Carlos Silva', 'Rafael Souza', 'Pedro Costa', 'João Santos'], ['Ana Lima', 'Maria Oliveira', 'Beatriz Alves', 'Fernanda Rocha']),
  ...makeAtletas('arg', 'A', 'arg', ['Diego Martínez', 'Nicolás García', 'Facundo López', 'Maximiliano Torres'], ['Valentina Rodríguez', 'Luciana Fernández', 'Camila González', 'Sofía Herrera']),
  ...makeAtletas('por', 'A', 'por', ['Tiago Ferreira', 'André Rodrigues', 'Gonçalo Pereira', 'Rui Carvalho'], ['Inês Santos', 'Margarida Silva', 'Catarina Lopes', 'Joana Costa']),
  ...makeAtletas('esp', 'A', 'esp', ['Alejandro Ruiz', 'Pablo Sánchez', 'Sergio Moreno', 'Miguel Jiménez'], ['Laura García', 'Carmen López', 'Isabel Martínez', 'Pilar Torres']),
  ...makeAtletas('ita', 'A', 'ita', ['Marco Rossi', 'Luca Ferrari', 'Giovanni Bianchi', 'Matteo Romano'], ['Sofia Ricci', 'Giulia Marino', 'Chiara Greco', 'Valentina Bruno']),
  ...makeAtletas('fra', 'A', 'fra', ['Pierre Dupont', 'Jean Martin', 'Louis Bernard', 'Paul Leroy'], ['Marie Dubois', 'Sophie Laurent', 'Camille Michel', 'Claire Moreau']),
];

const atlsCatB = [
  ...makeAtletas('eua', 'B', 'eua', ['John Smith', 'Mike Johnson', 'Chris Williams', 'James Brown'], ['Sarah Davis', 'Emma Wilson', 'Olivia Jones', 'Ava Taylor']),
  ...makeAtletas('aus', 'B', 'aus', ['Jack Wilson', 'Liam Anderson', 'Noah Thomas', 'Oliver Jackson'], ['Charlotte Moore', 'Amelia White', 'Harper Harris', 'Evelyn Martin']),
  ...makeAtletas('col', 'B', 'col', ['Andrés Torres', 'Camilo Díaz', 'Sebastián Vargas', 'Felipe Morales'], ['Valentina Gómez', 'Isabella Ramírez', 'Sofía Castro', 'Daniela Ortiz']),
  ...makeAtletas('chi', 'B', 'chi', ['Felipe Vargas', 'Diego Muñoz', 'Matías Fernández', 'Sebastián González'], ['Catalina López', 'Fernanda Martínez', 'Paula Rodríguez', 'Andrea Sánchez']),
  ...makeAtletas('mex', 'B', 'mex', ['Luis Hernández', 'Carlos García', 'Jorge Martínez', 'Manuel López'], ['Ana González', 'Carmen Rodríguez', 'Isabel Sánchez', 'María Fernández']),
  ...makeAtletas('uru', 'B', 'uru', ['Sebastian Díaz', 'Pablo Álvarez', 'Nicolás López', 'Mateo González'], ['Florencia Rodríguez', 'Valentina Martínez', 'Lucía Fernández', 'Camila Sánchez']),
];

// ─── Captain codes ────────────────────────────────────────────────────────────
const caps = [
  { codigo: 'BRA-A-2026', eqId: 'bra', catId: 'A' },
  { codigo: 'ARG-A-2026', eqId: 'arg', catId: 'A' },
  { codigo: 'POR-A-2026', eqId: 'por', catId: 'A' },
  { codigo: 'ESP-A-2026', eqId: 'esp', catId: 'A' },
  { codigo: 'ITA-A-2026', eqId: 'ita', catId: 'A' },
  { codigo: 'FRA-A-2026', eqId: 'fra', catId: 'A' },
  { codigo: 'EUA-B-2026', eqId: 'eua', catId: 'B' },
  { codigo: 'AUS-B-2026', eqId: 'aus', catId: 'B' },
  { codigo: 'COL-B-2026', eqId: 'col', catId: 'B' },
  { codigo: 'CHI-B-2026', eqId: 'chi', catId: 'B' },
  { codigo: 'MEX-B-2026', eqId: 'mex', catId: 'B' },
  { codigo: 'URU-B-2026', eqId: 'uru', catId: 'B' },
];

// ─── Jogos (round-robin per group) ───────────────────────────────────────────
_jogoCounter = 0;
const jogosA1 = gerarJogos(eqsCatA.filter(e => e.grupo === 1)); // BRA, ARG, POR
const jogosA2 = gerarJogos(eqsCatA.filter(e => e.grupo === 2)); // ESP, ITA, FRA
const jogosB1 = gerarJogos(eqsCatB.filter(e => e.grupo === 1)); // EUA, AUS, COL
const jogosB2 = gerarJogos(eqsCatB.filter(e => e.grupo === 2)); // CHI, MEX, URU

const allJogos = [...jogosA1, ...jogosA2, ...jogosB1, ...jogosB2];

// ─── INITIAL_STATE ────────────────────────────────────────────────────────────
export const INITIAL_STATE = {
  event: {
    nome: 'Copa do Mundo de Beach Tennis 2026',
    subtitulo: 'Circuito de Equipes',
  },
  cats: [
    { id: 'A', nome: 'Categoria A', ativa: true },
    { id: 'B', nome: 'Categoria B', ativa: true },
    { id: 'C', nome: 'Categoria C', ativa: false },
    { id: 'D', nome: 'Categoria D', ativa: false },
    { id: 'E', nome: 'Categoria E', ativa: false },
    { id: '+35', nome: 'Categoria +35', ativa: false },
    { id: '+60', nome: 'Categoria +60', ativa: false },
  ],
  eqs: [...eqsCatA, ...eqsCatB],
  caps,
  atls: [...atlsCatA, ...atlsCatB],
  jogos: allJogos,
  elim: {},
  numQuadras: 4,
};

// ─── Legacy compat exports (some old components may still import these) ───────
export const mockTeams = INITIAL_STATE.eqs.map(e => ({
  id: e.id, name: e.nome, flag: e.bandeira, category: e.catId,
}));
export const mockAthletes = INITIAL_STATE.atls.map(a => ({
  id: a.id, teamId: a.eqId, name: a.nome, gender: a.sexo, number: 0,
}));
export const mockCaptains = INITIAL_STATE.caps.map(c => ({
  id: `cap-${c.eqId}`, teamId: c.eqId, name: c.codigo, username: c.codigo.toLowerCase(), password: '1234', code: c.codigo,
}));
export const mockCourts = Array.from({ length: 4 }, (_, i) => ({
  id: `court${i+1}`, name: `Quadra ${i+1}`, location: 'Arena Principal', active: true,
}));
export const mockGroups = [
  { id: 'g-a1', category: 'A', name: 'Grupo A1', teamIds: ['bra','arg','por'] },
  { id: 'g-a2', category: 'A', name: 'Grupo A2', teamIds: ['esp','ita','fra'] },
  { id: 'g-b1', category: 'B', name: 'Grupo B1', teamIds: ['eua','aus','col'] },
  { id: 'g-b2', category: 'B', name: 'Grupo B2', teamIds: ['chi','mex','uru'] },
];
export const mockMatches = [];
export const mockStandings = {};
export const mockEvent = {
  id: 'evt1',
  name: INITIAL_STATE.event.nome,
  subtitle: INITIAL_STATE.event.subtitulo,
  location: 'Arena Beach, São Paulo - Brasil',
  startDate: '2026-05-20',
  endDate: '2026-05-24',
  status: 'active',
  activeCategories: ['A', 'B'],
};
