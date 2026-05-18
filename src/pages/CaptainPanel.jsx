import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { calcResultStatus } from '../data/mockData';
import { Swords, Users, LogOut, MapPin, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';

// ── Warmup countdown ────────────────────────────────────────────────────────
const WARMUP_MS = 6 * 60 * 1000;

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function WarmupTimer({ timerInicio, compact = false }) {
  const now = useNow(500);
  if (!timerInicio) return null;
  const remaining = Math.max(0, WARMUP_MS - (now - timerInicio));
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pct = (remaining / WARMUP_MS) * 100;
  const color = remaining <= 0 ? 'text-green-400' : remaining < 60000 ? 'text-yellow-400' : 'text-orange-400';

  if (compact) {
    return (
      <span className={`font-mono font-bold text-sm tabular-nums ${color}`}>
        {remaining <= 0 ? '✅ Pronto!' : `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
      </span>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">🔥 Aquecimento</p>
      <p className={`font-mono text-5xl font-black tabular-nums ${color}`}>
        {remaining <= 0 ? '00:00' : `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
      </p>
      <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      {remaining <= 0 && <p className="text-green-400 text-sm font-bold mt-2">✅ Fim do aquecimento — Boa partida!</p>}
    </div>
  );
}

// ── Escalação modal ──────────────────────────────────────────────────────────
function EscalacaoModal({ jogo, meuSlot, meusAtls, eq1Nome, eq2Nome, onClose, onSave }) {
  const esc = jogo.esc || {};
  const slot = String(meuSlot);
  const [fd, setFd] = useState([esc[`fd${slot}a`] || '', esc[`fd${slot}b`] || '']);
  const [md, setMd] = useState([esc[`md${slot}a`] || '', esc[`md${slot}b`] || '']);
  const [mx, setMx] = useState([esc[`mx${slot}a`] || '', esc[`mx${slot}b`] || '']);
  const [saving, setSaving] = useState(false);

  const femAtls = meusAtls.filter(a => a.sexo === 'F');
  const masAtls = meusAtls.filter(a => a.sexo === 'M');
  const advNome = meuSlot === 1 ? eq2Nome : eq1Nome;

  function toggleAtl(selected, setSelected, nome) {
    setSelected(prev => {
      const idx = prev.indexOf(nome);
      if (idx !== -1) {
        const next = [...prev]; next[idx] = ''; return next;
      }
      const emptyIdx = prev.indexOf('');
      if (emptyIdx !== -1) {
        const next = [...prev]; next[emptyIdx] = nome; return next;
      }
      return prev;
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(fd, md, mx);
    setSaving(false);
    onClose();
  }

  const fdOk = fd.filter(Boolean).length === 2;
  const mdOk = md.filter(Boolean).length === 2;
  const canSave = fdOk && mdOk;

  function AtlList({ title, atls, selected, setSelected, color }) {
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{title}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selected.filter(Boolean).length === 2 ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
            {selected.filter(Boolean).length}/2
          </span>
        </div>
        {atls.length === 0 ? (
          <div className="space-y-2">
            {[0, 1].map(i => (
              <input key={i} value={selected[i] || ''} onChange={e => {
                const next = [...selected]; next[i] = e.target.value; setSelected(next);
              }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500"
                placeholder={`Atleta ${i + 1}`}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {atls.map(a => {
              const sel = selected.includes(a.nome);
              const full = !sel && selected.filter(Boolean).length >= 2;
              return (
                <button key={a.id} onClick={() => !full && toggleAtl(selected, setSelected, a.nome)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    sel ? 'border-blue-500 bg-blue-900/30 text-white' :
                    full ? 'border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed opacity-40' :
                    'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? 'border-blue-400 bg-blue-400' : 'border-gray-600'}`}>
                    {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-medium">{a.nome}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Escalação — CAT {jogo.catId}</p>
            <h3 className="font-bold text-white">vs {advNome}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
        </div>
        <div className="p-5">
          <AtlList title="FD — Feminino Dupla" atls={femAtls} selected={fd} setSelected={setFd} color="#f472b6" />
          <AtlList title="MD — Masculino Dupla" atls={masAtls} selected={md} setSelected={setMd} color="#38bdf8" />
          <AtlList title="MX — Misto (se necessário)" atls={meusAtls} selected={mx} setSelected={setMx} color="#a78bfa" />
          <button onClick={handleSave} disabled={!canSave || saving}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all mt-2 ${
              canSave && !saving ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}>
            {saving ? 'Salvando...' : '✅ Confirmar Escalação'}
          </button>
          {!fdOk && <p className="text-xs text-pink-400 text-center mt-2">Selecione 2 atletas para FD</p>}
          {fdOk && !mdOk && <p className="text-xs text-blue-400 text-center mt-2">Selecione 2 atletas para MD</p>}
        </div>
      </div>
    </div>
  );
}

// ── Resultado modal ──────────────────────────────────────────────────────────
function ResultadoModal({ jogo, eq1Nome, eq2Nome, onClose, onSave }) {
  const [fd1, setFd1] = useState(jogo.det?.fd1 ?? '');
  const [fd2, setFd2] = useState(jogo.det?.fd2 ?? '');
  const [md1, setMd1] = useState(jogo.det?.md1 ?? '');
  const [md2, setMd2] = useState(jogo.det?.md2 ?? '');
  const [mx1, setMx1] = useState(jogo.det?.mx1 ?? '');
  const [mx2, setMx2] = useState(jogo.det?.mx2 ?? '');
  const [saving, setSaving] = useState(false);

  const n = v => parseInt(v) || 0;
  const fdW = fd1 !== '' && fd2 !== '' ? (n(fd1) > n(fd2) ? eq1Nome : n(fd2) > n(fd1) ? eq2Nome : null) : null;
  const mdW = md1 !== '' && md2 !== '' ? (n(md1) > n(md2) ? eq1Nome : n(md2) > n(md1) ? eq2Nome : null) : null;
  const needMX = !!(fdW && mdW && fdW !== mdW);

  async function handleSave() {
    const det = { fd1: n(fd1), fd2: n(fd2), md1: n(md1), md2: n(md2) };
    if (needMX) { det.mx1 = n(mx1); det.mx2 = n(mx2); }
    setSaving(true);
    await onSave(det);
    setSaving(false);
    onClose();
  }

  const canSave = fd1 !== '' && fd2 !== '' && md1 !== '' && md2 !== '' && (!needMX || (mx1 !== '' && mx2 !== ''));

  function ScoreRow({ label, v1, setV1, v2, setV2, winner, color }) {
    return (
      <div className="mb-3 bg-gray-800 rounded-xl p-4 border border-gray-700">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color }}>{label}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 truncate">{eq1Nome}</p>
            <input type="number" min="0" max="99" value={v1} onChange={e => setV1(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 text-center text-xl font-bold text-white outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-gray-600 font-bold text-xl shrink-0">×</span>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 truncate">{eq2Nome}</p>
            <input type="number" min="0" max="99" value={v2} onChange={e => setV2(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 text-center text-xl font-bold text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
        {winner && <p className="text-xs text-green-400 font-bold text-center mt-2">🏆 {winner}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Resultado — CAT {jogo.catId}</p>
            <h3 className="font-bold text-white">{eq1Nome} × {eq2Nome}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
        </div>
        <div className="p-5">
          <ScoreRow label="FD — Feminino Dupla" v1={fd1} setV1={setFd1} v2={fd2} setV2={setFd2} winner={fdW} color="#f472b6" />
          <ScoreRow label="MD — Masculino Dupla" v1={md1} setV1={setMd1} v2={md2} setV2={setMd2} winner={mdW} color="#38bdf8" />
          {needMX && (
            <ScoreRow label="MX — Misto Dupla (decisivo!)" v1={mx1} setV1={setMx1} v2={mx2} setV2={setMx2}
              winner={mx1 !== '' && mx2 !== '' ? (n(mx1) > n(mx2) ? eq1Nome : n(mx2) > n(mx1) ? eq2Nome : null) : null}
              color="#a78bfa"
            />
          )}
          {!needMX && (fdW || mdW) && (
            <p className="text-xs text-gray-500 text-center mb-3 italic">MX só jogado se FD e MD ficarem 1×1</p>
          )}
          <button onClick={handleSave} disabled={!canSave || saving}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              canSave && !saving ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}>
            {saving ? 'Salvando...' : '🏆 Confirmar Resultado'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Match card ───────────────────────────────────────────────────────────────
function JogoCard({ jogo, meuEqId, state, onTap }) {
  const now = useNow(1000);
  const eq1 = state.eqs.find(e => e.id === jogo.e1) || {};
  const eq2 = state.eqs.find(e => e.id === jogo.e2) || {};
  const advEq = meuEqId === jogo.e1 ? eq2 : eq1;
  const meuSlot = meuEqId === jogo.e1 ? 1 : 2;
  const slot = String(meuSlot);

  const esc = jogo.esc || {};
  const euEskalei = !!(esc[`fd${slot}a`] || esc[`fd${slot}b`] || esc[`md${slot}a`] || esc[`md${slot}b`]);

  const concluido = !!jogo.res;
  const temQuadra = !!jogo.quadra && !concluido;
  const temWarmup = !!jogo.timerInicio && !concluido;
  const remaining = temWarmup ? Math.max(0, WARMUP_MS - (now - jogo.timerInicio)) : null;

  let statusLabel = '🔒 Próxima rodada';
  let statusCls = 'bg-gray-800 text-gray-500';
  let borderCls = 'border-gray-800';
  let urgent = false;

  if (concluido) {
    const vencNome = state.eqs.find(e => e.id === jogo.venc)?.nome;
    statusLabel = `✅ ${jogo.res}${vencNome ? ` — ${vencNome}` : ''}`;
    statusCls = 'bg-gray-800 text-gray-500';
  } else if (temQuadra) {
    statusLabel = `🎾 Quadra ${jogo.quadra}`;
    statusCls = 'bg-green-900 text-green-300';
    borderCls = 'border-green-700';
    urgent = true;
  } else if (!euEskalei && !jogo.bloq) {
    statusLabel = '⚡ Escalar agora!';
    statusCls = 'bg-yellow-900 text-yellow-300';
    borderCls = 'border-yellow-700';
    urgent = true;
  } else if (euEskalei && !jogo.bloq) {
    statusLabel = '👥 Escalado — aguardando';
    statusCls = 'bg-blue-900 text-blue-300';
    borderCls = 'border-blue-800';
  } else if (euEskalei && jogo.bloq) {
    statusLabel = '👥 Pré-escalado';
    statusCls = 'bg-blue-900/50 text-blue-400';
    borderCls = 'border-blue-900';
  }

  return (
    <button onClick={onTap}
      className={`w-full text-left bg-gray-900 border ${borderCls} rounded-2xl p-4 transition-all active:scale-98`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">CAT {jogo.catId} · Grupo {jogo.gnome}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCls}`}>{statusLabel}</span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{advEq.bandeira}</span>
        <span className="text-white font-bold text-lg flex-1 truncate">{advEq.nome}</span>
        {urgent && <span className="text-yellow-400 text-xs animate-pulse">●</span>}
      </div>

      {temWarmup && (
        <div className="flex items-center gap-2 bg-orange-950/50 border border-orange-800 rounded-xl px-3 py-2 mt-2">
          <Clock size={13} className="text-orange-400 shrink-0" />
          <span className="text-xs text-orange-300">Aquecimento:</span>
          <WarmupTimer timerInicio={jogo.timerInicio} compact />
        </div>
      )}
      {concluido && jogo.det && (
        <p className="text-xs text-gray-500 mt-1">
          FD {jogo.det.fd1}×{jogo.det.fd2} · MD {jogo.det.md1}×{jogo.det.md2}
          {jogo.det.mx1 != null ? ` · MX ${jogo.det.mx1}×${jogo.det.mx2}` : ''}
        </p>
      )}
    </button>
  );
}

// ── Match detail modal ───────────────────────────────────────────────────────
function JogoModal({ jogo, meuEqId, state, onClose }) {
  const [modal, setModal] = useState(null);
  const { submitEscalacao, submitResultado } = useApp();

  const eq1 = state.eqs.find(e => e.id === jogo.e1) || {};
  const eq2 = state.eqs.find(e => e.id === jogo.e2) || {};
  const meuSlot = meuEqId === jogo.e1 ? 1 : 2;
  const advSlot = meuSlot === 1 ? 2 : 1;
  const meusAtls = state.atls.filter(a => a.eqId === meuEqId);
  const advEq = meuSlot === 1 ? eq2 : eq1;
  const slot = String(meuSlot);
  const advSlotStr = String(advSlot);

  const esc = jogo.esc || {};
  const euEskalei = !!(esc[`fd${slot}a`] || esc[`fd${slot}b`] || esc[`md${slot}a`] || esc[`md${slot}b`]);
  const advEskalou = !!(esc[`fd${advSlotStr}a`] || esc[`fd${advSlotStr}b`] || esc[`md${advSlotStr}a`] || esc[`md${advSlotStr}b`]);
  const concluido = !!jogo.res;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-40 flex items-end sm:items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">CAT {jogo.catId} · Grupo {jogo.gnome}</p>
              <h3 className="font-bold text-white text-lg">{eq1.bandeira} {eq1.nome} × {eq2.nome} {eq2.bandeira}</h3>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Court */}
            {jogo.quadra && !concluido && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-xl px-4 py-4 text-center">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-1">Sua quadra</p>
                <p className="text-4xl font-black text-white">Quadra {jogo.quadra}</p>
                <p className="text-xs text-blue-300 mt-1">Dirija-se imediatamente!</p>
              </div>
            )}
            {!jogo.quadra && !concluido && (
              <div className="flex items-center justify-center gap-2 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-500 text-sm">
                <MapPin size={14} />Aguardando quadra do organizador...
              </div>
            )}

            {/* Warmup */}
            {jogo.timerInicio && !concluido && <WarmupTimer timerInicio={jogo.timerInicio} />}

            {/* Result */}
            {concluido && (
              <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Resultado Final</p>
                <p className="text-3xl font-black text-green-400">{jogo.res}</p>
                {jogo.venc && <p className="text-sm text-gray-400 mt-1">🏆 {state.eqs.find(e => e.id === jogo.venc)?.nome}</p>}
                {jogo.det && (
                  <p className="text-xs text-gray-500 mt-2">
                    FD {jogo.det.fd1}×{jogo.det.fd2} · MD {jogo.det.md1}×{jogo.det.md2}
                    {jogo.det.mx1 != null ? ` · MX ${jogo.det.mx1}×${jogo.det.mx2}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Escalation status */}
            {!concluido && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Escalações</p>
                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${euEskalei ? 'bg-green-900/20 border-green-800' : 'bg-gray-800 border-gray-700'}`}>
                  {euEskalei ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-yellow-400" />}
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${euEskalei ? 'text-green-300' : 'text-yellow-300'}`}>
                      Minha equipe: {euEskalei ? 'Escalado ✓' : 'Pendente'}
                    </p>
                    {euEskalei && (
                      <p className="text-xs text-gray-500 truncate">
                        FD: {[esc[`fd${slot}a`], esc[`fd${slot}b`]].filter(Boolean).join(' / ') || '—'} ·
                        MD: {[esc[`md${slot}a`], esc[`md${slot}b`]].filter(Boolean).join(' / ') || '—'}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${advEskalou ? 'bg-green-900/20 border-green-800' : 'bg-gray-800 border-gray-700'}`}>
                  {advEskalou ? <CheckCircle2 size={16} className="text-green-400" /> : <Clock size={16} className="text-gray-500" />}
                  <p className={`text-sm font-medium ${advEskalou ? 'text-green-300' : 'text-gray-500'}`}>
                    {advEq.nome}: {advEskalou ? 'Escalado ✓' : 'Aguardando...'}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            {!concluido && (
              <div className="space-y-2 pt-1">
                <button onClick={() => setModal('esc')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors">
                  {euEskalei ? '✏️ Editar Escalação' : '👥 Escalar Equipe'}
                </button>
                {jogo.quadra && (
                  <button onClick={() => setModal('res')}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl transition-colors">
                    🏆 Inserir Resultado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal === 'esc' && (
        <EscalacaoModal jogo={jogo} meuSlot={meuSlot} meusAtls={meusAtls}
          eq1Nome={eq1.nome} eq2Nome={eq2.nome} onClose={() => setModal(null)}
          onSave={(fd, md, mx) => submitEscalacao(jogo.id, meuSlot, fd, md, mx)}
        />
      )}
      {modal === 'res' && (
        <ResultadoModal jogo={jogo} eq1Nome={eq1.nome} eq2Nome={eq2.nome}
          onClose={() => setModal(null)}
          onSave={(det) => submitResultado(jogo.id, det)}
        />
      )}
    </>
  );
}

// ── Team tab ─────────────────────────────────────────────────────────────────
function EquipeTab({ eq, state }) {
  const atls = state.atls.filter(a => a.eqId === eq.id);
  const masAtls = atls.filter(a => a.sexo === 'M');
  const femAtls = atls.filter(a => a.sexo === 'F');
  const cap = state.caps.find(c => c.eqId === eq.id);

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
        <p className="text-5xl mb-2">{eq.bandeira}</p>
        <h2 className="text-2xl font-bold text-white">{eq.nome}</h2>
        <p className="text-gray-500 text-sm mt-1">Categoria {eq.catId} · Grupo {eq.gnome || eq.grupo}</p>
        {cap && (
          <div className="mt-3 inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
            <span className="text-xs text-gray-500">Código:</span>
            <span className="font-mono font-bold text-blue-400 text-sm">{cap.codigo}</span>
          </div>
        )}
      </div>

      {masAtls.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-800 border-b border-gray-700">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Masculino</p>
          </div>
          {masAtls.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0">
              <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold text-xs">
                {a.nome.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <span className="text-white font-medium text-sm">{a.nome}</span>
            </div>
          ))}
        </div>
      )}

      {femAtls.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-800 border-b border-gray-700">
            <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">Feminino</p>
          </div>
          {femAtls.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0">
              <div className="w-8 h-8 rounded-full bg-pink-900 flex items-center justify-center text-pink-300 font-bold text-xs">
                {a.nome.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <span className="text-white font-medium text-sm">{a.nome}</span>
            </div>
          ))}
        </div>
      )}

      {atls.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600 text-sm">
          Nenhum atleta cadastrado
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export function CaptainPanel() {
  const { user, logout } = useAuth();
  const { state } = useApp();
  const [tab, setTab] = useState('jogos');
  const [selectedJogo, setSelectedJogo] = useState(null);
  const now = useNow(5000);

  const { eq } = user;
  const meusJogos = state.jogos.filter(j => j.e1 === eq.id || j.e2 === eq.id);
  const catAtiva = state.cats.find(c => c.id === eq.catId)?.ativa !== false;

  const pending = meusJogos.filter(j => !j.res);
  const concluidos = meusJogos.filter(j => !!j.res);

  const urgentCount = pending.filter(j => {
    const slot = String(j.e1 === eq.id ? 1 : 2);
    const esc = j.esc || {};
    const euEskalei = !!(esc[`fd${slot}a`] || esc[`fd${slot}b`] || esc[`md${slot}a`] || esc[`md${slot}b`]);
    return j.quadra || (!euEskalei && !j.bloq);
  }).length;

  const warmupAtivo = pending.find(j => j.timerInicio);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{eq.bandeira}</span>
            <div className="min-w-0">
              <p className="font-bold text-white leading-tight truncate">{eq.nome}</p>
              <p className="text-xs text-gray-500">Categoria {eq.catId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {warmupAtivo && (
              <button onClick={() => setSelectedJogo(warmupAtivo)}
                className="flex items-center gap-1.5 bg-orange-950 border border-orange-800 rounded-xl px-3 py-1.5">
                <span className="text-orange-400 text-xs">🔥</span>
                <WarmupTimer timerInicio={warmupAtivo.timerInicio} compact />
              </button>
            )}
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {!catAtiva && (
        <div className="bg-yellow-950 border-b border-yellow-900 px-4 py-2 text-center">
          <p className="text-xs text-yellow-400 font-medium">⚠️ Categoria {eq.catId} bloqueada pelo organizador</p>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 max-w-lg mx-auto w-full">
        {tab === 'jogos' ? (
          <div className="space-y-3">
            {pending.filter(j => !j.bloq || j.quadra).length > 0 && (
              <>
                {urgentCount > 0 && (
                  <p className="text-xs text-yellow-500 uppercase tracking-widest font-semibold px-1">🔔 Ação necessária</p>
                )}
                {pending.filter(j => !j.bloq || j.quadra).map(j => (
                  <JogoCard key={j.id} jogo={j} meuEqId={eq.id} state={state} onTap={() => setSelectedJogo(j)} />
                ))}
              </>
            )}
            {pending.filter(j => j.bloq && !j.quadra).length > 0 && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold px-1 mt-4">🔒 Próximas rodadas</p>
                {pending.filter(j => j.bloq && !j.quadra).map(j => (
                  <JogoCard key={j.id} jogo={j} meuEqId={eq.id} state={state} onTap={() => setSelectedJogo(j)} />
                ))}
              </>
            )}
            {concluidos.length > 0 && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold px-1 mt-4">✅ Concluídos</p>
                {concluidos.map(j => (
                  <JogoCard key={j.id} jogo={j} meuEqId={eq.id} state={state} onTap={() => setSelectedJogo(j)} />
                ))}
              </>
            )}
            {meusJogos.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <Swords size={40} className="mx-auto mb-4 opacity-40" />
                <p className="font-medium">Nenhum confronto ainda</p>
                <p className="text-sm mt-1 text-gray-700">Aguarde o organizador configurar os jogos</p>
              </div>
            )}
          </div>
        ) : (
          <EquipeTab eq={eq} state={state} />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-30">
        <div className="flex max-w-lg mx-auto">
          {[
            { id: 'jogos', label: 'Jogos', icon: Swords, badge: urgentCount },
            { id: 'equipe', label: 'Equipe', icon: Users },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center py-3 relative transition-colors ${tab === id ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className="relative">
                <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-0.5 font-medium">{label}</span>
              {tab === id && <div className="absolute bottom-0 w-8 h-0.5 bg-blue-400 rounded-t" />}
            </button>
          ))}
        </div>
      </nav>

      {selectedJogo && (
        <JogoModal jogo={selectedJogo} meuEqId={eq.id} state={state} onClose={() => setSelectedJogo(null)} />
      )}
    </div>
  );
}
