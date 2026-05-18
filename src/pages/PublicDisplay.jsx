import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../contexts/AppContext';

const WARMUP_MS = 6 * 60 * 1000;

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtTimer(ms) {
  if (ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function calcStandings(eqs, jogos) {
  const map = {};
  for (const eq of eqs) {
    map[eq.id] = { eqId: eq.id, j: 0, v: 0, d: 0, gv: 0, gd: 0, pts: 0 };
  }
  for (const jogo of jogos) {
    if (!jogo.res || !jogo.venc) continue;
    const r1 = map[jogo.e1];
    const r2 = map[jogo.e2];
    if (!r1 || !r2) continue;
    r1.j++; r2.j++;
    const det = jogo.det || {};
    for (const k of ['fd', 'md', 'mx']) {
      const s = det[k];
      if (!s) continue;
      r1.gv += s.s1 || 0; r1.gd += s.s2 || 0;
      r2.gv += s.s2 || 0; r2.gd += s.s1 || 0;
    }
    if (jogo.venc === jogo.e1) { r1.v++; r1.pts += 3; r2.d++; }
    else { r2.v++; r2.pts += 3; r1.d++; }
  }
  return map;
}

function LiveSection({ jogos, eqs, nowMs }) {
  const liveJogos = jogos.filter(j => j.quadra && !j.res);

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-yellow-400 animate-pulse">⚡</span>
        Ao Vivo Agora
        {liveJogos.length > 0 && (
          <span className="ml-2 bg-green-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">
            {liveJogos.length}
          </span>
        )}
      </h2>

      {liveJogos.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl px-6 py-8 text-center text-gray-500 text-lg">
          Nenhuma partida ao vivo no momento
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {liveJogos.map(jogo => {
            const eq1 = eqs.find(e => e.id === jogo.e1);
            const eq2 = eqs.find(e => e.id === jogo.e2);
            const elapsed = jogo.timerInicio ? nowMs - jogo.timerInicio : 0;
            const remaining = Math.max(0, WARMUP_MS - elapsed);
            const isWarmup = jogo.timerInicio && remaining > 0;
            const isPlaying = jogo.timerInicio && remaining <= 0;

            return (
              <div key={jogo.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <span className="text-3xl">{eq1?.bandeira}</span>
                    <span className="truncate">{eq1?.nome}</span>
                  </div>
                  <span className="text-gray-500 text-lg font-bold shrink-0">vs</span>
                  <div className="flex items-center gap-2 text-xl font-bold text-white flex-row-reverse">
                    <span className="text-3xl">{eq2?.bandeira}</span>
                    <span className="truncate">{eq2?.nome}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-700 text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                    CAT {jogo.catId}
                  </span>
                  <span className="bg-gray-700 text-gray-300 text-sm px-2.5 py-1 rounded-lg">
                    Quadra {jogo.quadra}
                  </span>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                    isPlaying ? 'bg-green-900 text-green-300' :
                    isWarmup ? 'bg-orange-900 text-orange-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {isPlaying ? '🎾 Em Jogo' : isWarmup ? `⏱ ${fmtTimer(remaining)}` : 'Escalando'}
                  </span>
                </div>

                <div className="text-xs text-gray-500">{jogo.gnome}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StandingsSection({ eqs, jogos, cats }) {
  const activeCats = cats.filter(c => c.ativa);
  const allGroups = [];
  for (const cat of activeCats) {
    const catEqs = eqs.filter(e => e.catId === cat.id);
    const grupoNums = [...new Set(catEqs.map(e => e.grupo))].sort((a, b) => a - b);
    for (const g of grupoNums) {
      const grpEqs = catEqs.filter(e => e.grupo === g);
      const grpJogos = jogos.filter(j => j.catId === cat.id && j.grupo === g);
      allGroups.push({ catId: cat.id, grupo: g, eqs: grpEqs, jogos: grpJogos });
    }
  }

  if (allGroups.length === 0) return null;

  const standings = calcStandings(eqs, jogos);

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Classificação dos Grupos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {allGroups.map(({ catId, grupo, eqs: grpEqs }) => {
          const rows = grpEqs.map(eq => ({ eq, s: standings[eq.id] || { pts: 0, v: 0, gv: 0, gd: 0 } }))
            .sort((a, b) => b.s.pts - a.s.pts || b.s.v - a.s.v || (b.s.gv - b.s.gd) - (a.s.gv - a.s.gd))
            .slice(0, 3);

          return (
            <div key={`${catId}-${grupo}`} className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
                <span className="font-bold text-white">Grupo {grupo}</span>
                <span className="bg-blue-700 text-white text-xs font-bold px-2 py-0.5 rounded">CAT {catId}</span>
              </div>
              <div className="divide-y divide-gray-800">
                {rows.map(({ eq, s }, idx) => (
                  <div key={eq.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-lg w-7 text-center shrink-0">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-gray-600 text-sm font-bold">{idx + 1}</span>}
                    </span>
                    <span className="text-2xl shrink-0">{eq.bandeira}</span>
                    <span className="text-white font-semibold flex-1 truncate text-sm">{eq.nome}</span>
                    <div className="text-right shrink-0">
                      <span className="text-white font-bold">{s.pts}</span>
                      <span className="text-gray-500 text-xs ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UpcomingSection({ jogos, eqs }) {
  const upcoming = jogos.filter(j => !j.res && !j.quadra);
  if (upcoming.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">Próximas Partidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {upcoming.slice(0, 12).map(jogo => {
          const eq1 = eqs.find(e => e.id === jogo.e1);
          const eq2 = eqs.find(e => e.id === jogo.e2);
          return (
            <div key={jogo.id} className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="shrink-0 bg-gray-800 rounded-lg px-3 py-2 text-center min-w-[48px]">
                <span className="text-blue-400 font-bold text-sm">Cat {jogo.catId}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-white font-semibold text-sm truncate">
                  <span>{eq1?.bandeira}</span>
                  <span className="truncate">{eq1?.nome}</span>
                  <span className="text-gray-500 mx-1 shrink-0">vs</span>
                  <span className="truncate">{eq2?.nome}</span>
                  <span>{eq2?.bandeira}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{jogo.gnome}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DisplayContent() {
  const { state } = useApp();
  const now = useNow(1000);
  const eqs = state.eqs || [];
  const jogos = state.jogos || [];
  const cats = state.cats || [];
  const event = state.event || {};

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">🎾</span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight truncate">
                {event.nome || 'Copa do Mundo Beach Tennis'}
              </h1>
              {event.subtitulo && (
                <p className="text-gray-400 text-sm truncate">{event.subtitulo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {formatTime(now)}
            </span>
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              AO VIVO
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <LiveSection jogos={jogos} eqs={eqs} nowMs={now.getTime()} />
        <StandingsSection eqs={eqs} jogos={jogos} cats={cats} />
        <UpcomingSection jogos={jogos} eqs={eqs} />
      </main>

      <footer className="text-center text-gray-700 text-xs py-4 border-t border-gray-900">
        Atualização em tempo real via Firebase
      </footer>
    </div>
  );
}

export function PublicDisplay() {
  return (
    <AppProvider>
      <DisplayContent />
    </AppProvider>
  );
}
