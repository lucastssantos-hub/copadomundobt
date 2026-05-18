import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { calcResultStatus } from '../../data/mockData';
import { MapPin, X, CheckCircle2, MessageCircle, Edit2 } from 'lucide-react';

const WARMUP_MS = 6 * 60 * 1000;
const APP_URL = window.location.origin + (import.meta.env.BASE_URL || '/');

function waLink(eq1, eq2, jogo, cap) {
  const texto = `🎾 *Copa do Mundo Beach Tennis 2026*\n\n${eq1?.bandeira || ''} *${eq1?.nome}* vs ${eq2?.bandeira || ''} *${eq2?.nome}*\nCategoria ${jogo.catId} · Grupo ${jogo.gnome}\n\n${cap ? `Código do capitão: *${cap.codigo}*` : ''}\nAcesse: ${APP_URL}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

function fmtTimer(ms) {
  if (ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ResultModal({ jogo, eq1, eq2, onClose, onSave }) {
  const det = jogo.det || {};
  const [fd1, setFd1] = useState(det.fd1 ?? '');
  const [fd2, setFd2] = useState(det.fd2 ?? '');
  const [md1, setMd1] = useState(det.md1 ?? '');
  const [md2, setMd2] = useState(det.md2 ?? '');
  const [mx1, setMx1] = useState(det.mx1 ?? '');
  const [mx2, setMx2] = useState(det.mx2 ?? '');
  const [saving, setSaving] = useState(false);

  const n = v => parseInt(v) || 0;
  const fdW = fd1 !== '' && fd2 !== '' ? (n(fd1) > n(fd2) ? eq1 : n(fd2) > n(fd1) ? eq2 : null) : null;
  const mdW = md1 !== '' && md2 !== '' ? (n(md1) > n(md2) ? eq1 : n(md2) > n(md1) ? eq2 : null) : null;
  const needMX = !!(fdW && mdW && fdW.id !== mdW.id);
  const canSave = fd1 !== '' && fd2 !== '' && md1 !== '' && md2 !== '' && (!needMX || (mx1 !== '' && mx2 !== ''));

  async function handleSave() {
    const newDet = { fd1: n(fd1), fd2: n(fd2), md1: n(md1), md2: n(md2) };
    if (needMX) { newDet.mx1 = n(mx1); newDet.mx2 = n(mx2); }
    setSaving(true);
    await onSave(newDet);
    setSaving(false);
    onClose();
  }

  function ScoreRow({ label, v1, setV1, v2, setV2, winner, color }) {
    return (
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color }}>{label}</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <span className="flex-1 text-sm font-medium text-gray-700 truncate">{eq1.nome}</span>
          <input type="number" min="0" value={v1} onChange={e => setV1(e.target.value)}
            className="w-14 text-center text-lg font-bold border-2 border-gray-200 rounded-lg py-1 outline-none focus:border-blue-500" />
          <span className="text-gray-400 font-bold">×</span>
          <input type="number" min="0" value={v2} onChange={e => setV2(e.target.value)}
            className="w-14 text-center text-lg font-bold border-2 border-gray-200 rounded-lg py-1 outline-none focus:border-blue-500" />
          <span className="flex-1 text-sm font-medium text-gray-700 truncate text-right">{eq2.nome}</span>
        </div>
        {winner && <p className="text-xs text-green-600 font-bold text-center mt-1">🏆 {winner.nome}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-900">Lançar Resultado</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4 text-center font-medium">{eq1.nome} × {eq2.nome} · CAT {jogo.catId}</p>
          <ScoreRow label="FD — Feminino Dupla" v1={fd1} setV1={setFd1} v2={fd2} setV2={setFd2} winner={fdW} color="#db2777" />
          <ScoreRow label="MD — Masculino Dupla" v1={md1} setV1={setMd1} v2={md2} setV2={setMd2} winner={mdW} color="#0ea5e9" />
          {needMX && <ScoreRow label="MX — Misto (decisivo)" v1={mx1} setV1={setMx1} v2={mx2} setV2={setMx2}
            winner={mx1 !== '' && mx2 !== '' ? (n(mx1) > n(mx2) ? eq1 : n(mx2) > n(mx1) ? eq2 : null) : null} color="#7c3aed" />}
          {!needMX && (fdW || mdW) && (
            <p className="text-xs text-gray-400 text-center mb-3 italic">MX só jogado se FD e MD ficarem 1×1</p>
          )}
          <button onClick={handleSave} disabled={!canSave || saving}
            className={`w-full py-3 rounded-xl font-bold transition-all ${canSave && !saving ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            {saving ? 'Salvando...' : '💾 Salvar Resultado'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignQuadraModal({ jogo, state, onClose }) {
  const { assignQuadra, liberarQuadra } = useApp();
  const numQ = state.numQuadras || 4;
  const occupied = {};
  state.jogos.forEach(j => { if (j.quadra && j.id !== jogo.id && !j.res) occupied[String(j.quadra)] = j; });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-900">Atribuir Quadra</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Array.from({ length: numQ }, (_, i) => i + 1).map(q => {
              const isSel = String(jogo.quadra) === String(q);
              const isOcup = !!occupied[String(q)];
              const ocuJogo = occupied[String(q)];
              return (
                <button key={q}
                  onClick={async () => {
                    if (isOcup) return;
                    await assignQuadra(jogo.id, isSel ? null : String(q));
                    onClose();
                  }}
                  title={isOcup && ocuJogo ? `Ocupada: ${state.eqs.find(e => e.id === ocuJogo.e1)?.nome}` : ''}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    isSel ? 'bg-blue-600 text-white' :
                    isOcup ? 'bg-red-100 text-red-400 cursor-not-allowed' :
                    'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}>
                  Q{q}
                  {isOcup && <div className="text-xs font-normal opacity-70 truncate">
                    {state.eqs.find(e => e.id === ocuJogo?.e1)?.nome?.slice(0, 3)}
                  </div>}
                </button>
              );
            })}
          </div>
          {jogo.quadra && (
            <button onClick={async () => { await liberarQuadra(jogo.id); onClose(); }}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
              🔓 Liberar Quadra {jogo.quadra}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function JogoAdmCard({ jogo, state }) {
  const { submitResultado } = useApp();
  const [modal, setModal] = useState(null);
  const now = Date.now();

  const eq1 = state.eqs.find(e => e.id === jogo.e1) || { nome: jogo.e1, bandeira: '', id: jogo.e1 };
  const eq2 = state.eqs.find(e => e.id === jogo.e2) || { nome: jogo.e2, bandeira: '', id: jogo.e2 };
  const cap1 = state.caps.find(c => c.eqId === jogo.e1);
  const cap2 = state.caps.find(c => c.eqId === jogo.e2);

  const esc = jogo.esc || {};
  const esc1ok = !!(esc.fd1a || esc.fd1b || esc.md1a || esc.md1b);
  const esc2ok = !!(esc.fd2a || esc.fd2b || esc.md2a || esc.md2b);
  const concluido = !!jogo.res;
  const temWarmup = !!jogo.timerInicio && !concluido;
  const remaining = temWarmup ? Math.max(0, WARMUP_MS - (now - jogo.timerInicio)) : null;

  let borderCls = 'border-gray-200';
  if (concluido) borderCls = 'border-gray-100';
  else if (jogo.quadra) borderCls = 'border-green-300';
  else if (esc1ok && esc2ok) borderCls = 'border-blue-300';

  return (
    <>
      <div className={`bg-white border-2 ${borderCls} rounded-2xl p-4 shadow-sm transition-all`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {jogo.bloq && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">🔒 Bloqueado</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {concluido && <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded">✅ {jogo.res}</span>}
            {!concluido && jogo.quadra && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">🎾 Q{jogo.quadra}</span>}
            {temWarmup && remaining !== null && <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded">🔥 {fmtTimer(remaining)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{eq1.bandeira}</span>
          <span className="font-semibold text-gray-900 text-sm flex-1">{eq1.nome}</span>
          <span className="text-gray-400 text-sm font-bold shrink-0">vs</span>
          <span className="font-semibold text-gray-900 text-sm flex-1 text-right">{eq2.nome}</span>
          <span className="text-xl">{eq2.bandeira}</span>
        </div>

        {!concluido && (
          <div className="flex gap-2 mb-3">
            <span className={`flex items-center gap-1 flex-1 text-xs px-2 py-1.5 rounded-lg ${esc1ok ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
              {esc1ok ? '✅' : '⏳'} {eq1.nome.split(' ')[0]}
            </span>
            <span className={`flex items-center gap-1 flex-1 text-xs px-2 py-1.5 rounded-lg justify-end ${esc2ok ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
              {eq2.nome.split(' ')[0]} {esc2ok ? '✅' : '⏳'}
            </span>
          </div>
        )}

        {concluido && jogo.det && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
            FD: {jogo.det.fd1}×{jogo.det.fd2} · MD: {jogo.det.md1}×{jogo.det.md2}
            {jogo.det.mx1 != null ? ` · MX: ${jogo.det.mx1}×${jogo.det.mx2}` : ''}
            {jogo.venc && ` · 🏆 ${state.eqs.find(e => e.id === jogo.venc)?.nome}`}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!concluido && (
            <button onClick={() => setModal('quadra')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">
              <MapPin size={13} />{jogo.quadra ? `Q${jogo.quadra}` : 'Quadra'}
            </button>
          )}
          <button onClick={() => setModal('resultado')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100">
            <Edit2 size={13} />{concluido ? 'Editar' : 'Resultado'}
          </button>
          {cap1 && (
            <a href={waLink(eq1, eq2, jogo, cap1)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100">
              <MessageCircle size={13} />{eq1.nome.split(' ')[0]}
            </a>
          )}
          {cap2 && (
            <a href={waLink(eq1, eq2, jogo, cap2)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100">
              <MessageCircle size={13} />{eq2.nome.split(' ')[0]}
            </a>
          )}
        </div>
      </div>

      {modal === 'quadra' && (
        <AssignQuadraModal jogo={jogo} state={state} onClose={() => setModal(null)} />
      )}
      {modal === 'resultado' && (
        <ResultModal jogo={jogo} eq1={eq1} eq2={eq2} onClose={() => setModal(null)}
          onSave={det => submitResultado(jogo.id, det)} />
      )}
    </>
  );
}

export function AdmMatches() {
  const { state } = useApp();
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');

  const activeCats = [...new Set(state.jogos.map(j => j.catId))].sort();

  let jogos = state.jogos;
  if (catFilter !== 'all') jogos = jogos.filter(j => j.catId === catFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    jogos = jogos.filter(j => {
      const e1 = state.eqs.find(e => e.id === j.e1);
      const e2 = state.eqs.find(e => e.id === j.e2);
      return e1?.nome.toLowerCase().includes(q) || e2?.nome.toLowerCase().includes(q) ||
        j.catId.toLowerCase().includes(q) || String(j.gnome).toLowerCase().includes(q);
    });
  }

  const grouped = {};
  jogos.forEach(j => {
    const k = `${j.catId}|${j.gnome}`;
    if (!grouped[k]) grouped[k] = { catId: j.catId, gnome: j.gnome, jogos: [] };
    grouped[k].jogos.push(j);
  });

  const total = state.jogos.length;
  const done = state.jogos.filter(j => j.res).length;
  const live = state.jogos.filter(j => j.quadra && !j.res).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">Confrontos</h2>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-semibold">{done}/{total} concluídos</span>
          {live > 0 && <span className="text-blue-600 font-semibold">{live} em quadra</span>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...activeCats].map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              catFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {cat === 'all' ? 'Todos' : `CAT ${cat}`}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        placeholder="Buscar equipe ou grupo..." />

      {Object.values(grouped).map(group => (
        <div key={`${group.catId}-${group.gnome}`} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">CAT {group.catId}</span>
            <span className="text-xs font-semibold text-gray-500">Grupo {group.gnome}</span>
            <span className="text-xs text-gray-400">({group.jogos.filter(j => j.res).length}/{group.jogos.length})</span>
          </div>
          {group.jogos.map(j => <JogoAdmCard key={j.id} jogo={j} state={state} />)}
        </div>
      ))}

      {jogos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum confronto</p>
          <p className="text-sm mt-1">Configure grupos nas abas anteriores</p>
        </div>
      )}
    </div>
  );
}
