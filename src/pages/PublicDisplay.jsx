import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from '../contexts/AppContext';
import { MATCH_STATUS } from '../data/mockData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function gameTypeIcon(type) {
  if (type === 'male') return '♂';
  if (type === 'female') return '♀';
  return '⚥';
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function WarmupCountdown({ warmupStartedAt }) {
  const now = useNow(500);
  const WARMUP_DURATION_MS = 10 * 60 * 1000; // 10 minutes warmup window

  if (!warmupStartedAt) return null;

  const elapsed = now.getTime() - warmupStartedAt;
  const remaining = Math.max(0, WARMUP_DURATION_MS - elapsed);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <span className="font-mono text-orange-400 text-sm tabular-nums">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ─── Section 1: Live Now ──────────────────────────────────────────────────────

function LiveSection({ matches, teams, courts }) {
  const liveMatches = matches.filter(m =>
    m.games.some(g => g.status === MATCH_STATUS.IN_PROGRESS || g.status === MATCH_STATUS.WARMING_UP)
  );

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-yellow-400 animate-pulse">⚡</span>
        Ao Vivo Agora
        {liveMatches.length > 0 && (
          <span className="ml-2 bg-green-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">
            {liveMatches.length}
          </span>
        )}
      </h2>

      {liveMatches.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl px-6 py-8 text-center text-gray-500 text-lg">
          Nenhuma partida ao vivo no momento
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {liveMatches.map(match => {
            const team1 = teams.find(t => t.id === match.team1Id);
            const team2 = teams.find(t => t.id === match.team2Id);
            const liveGames = match.games.filter(g =>
              g.status === MATCH_STATUS.IN_PROGRESS || g.status === MATCH_STATUS.WARMING_UP
            );
            const court = courts.find(c => c.id === match.courtId);

            return (
              <div
                key={match.id}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3"
              >
                {/* Teams */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <span className="text-3xl">{team1?.flag}</span>
                    <span className="truncate">{team1?.name}</span>
                  </div>
                  <span className="text-gray-500 text-lg font-bold shrink-0">vs</span>
                  <div className="flex items-center gap-2 text-xl font-bold text-white flex-row-reverse">
                    <span className="text-3xl">{team2?.flag}</span>
                    <span className="truncate">{team2?.name}</span>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-700 text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                    CAT {match.category}
                  </span>
                  {court && (
                    <span className="bg-gray-700 text-gray-300 text-sm px-2.5 py-1 rounded-lg">
                      {court.name}
                    </span>
                  )}
                </div>

                {/* Individual games */}
                {liveGames.map(game => (
                  <div
                    key={game.id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      game.status === MATCH_STATUS.IN_PROGRESS
                        ? 'bg-green-900/60 border border-green-700'
                        : 'bg-orange-900/50 border border-orange-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{gameTypeIcon(game.type)}</span>
                      <span className={`text-sm font-semibold ${
                        game.status === MATCH_STATUS.IN_PROGRESS ? 'text-green-300' : 'text-orange-300'
                      }`}>
                        {game.status === MATCH_STATUS.IN_PROGRESS ? 'Em Jogo' : 'Aquecimento'}
                      </span>
                    </div>
                    {game.status === MATCH_STATUS.WARMING_UP && game.warmupStartedAt && (
                      <WarmupCountdown warmupStartedAt={game.warmupStartedAt} />
                    )}
                    {game.status === MATCH_STATUS.IN_PROGRESS && (
                      <span className="text-white font-bold text-sm">
                        {game.score1 ?? '-'} × {game.score2 ?? '-'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Section 2: Standings ─────────────────────────────────────────────────────

function StandingsSection({ groups, teams, standings }) {
  if (groups.length === 0) return null;

  function medalFor(idx) {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">
        Classificação dos Grupos
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(group => {
          const rows = (standings[group.id] || [])
            .slice()
            .sort((a, b) => b.points - a.points || b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost))
            .slice(0, 3);

          return (
            <div key={group.id} className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              {/* Group header */}
              <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
                <span className="font-bold text-white">{group.name}</span>
                <span className="bg-blue-700 text-white text-xs font-bold px-2 py-0.5 rounded">
                  CAT {group.category}
                </span>
              </div>

              {/* Top 3 rows */}
              <div className="divide-y divide-gray-800">
                {rows.length === 0 ? (
                  <p className="text-gray-600 text-sm px-4 py-3">Sem dados</p>
                ) : (
                  rows.map((row, idx) => {
                    const team = teams.find(t => t.id === row.teamId);
                    const medal = medalFor(idx);
                    return (
                      <div
                        key={row.teamId}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <span className="text-xl w-7 text-center shrink-0">
                          {medal || <span className="text-gray-600 text-sm font-bold">{idx + 1}</span>}
                        </span>
                        <span className="text-2xl shrink-0">{team?.flag}</span>
                        <span className="text-white font-semibold flex-1 truncate text-sm">
                          {team?.name}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="text-white font-bold">{row.points}</span>
                          <span className="text-gray-500 text-xs ml-1">pts</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section 3: Upcoming ─────────────────────────────────────────────────────

function UpcomingSection({ matches, teams, courts }) {
  const upcoming = matches
    .filter(m => m.status !== MATCH_STATUS.FINISHED && m.scheduledTime)
    .sort((a, b) => (a.scheduledTime > b.scheduledTime ? 1 : -1))
    .slice(0, 12);

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">
        Próximas Partidas
      </h2>

      {upcoming.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl px-6 py-8 text-center text-gray-500 text-lg">
          Nenhuma partida agendada
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {upcoming.map(match => {
            const team1 = teams.find(t => t.id === match.team1Id);
            const team2 = teams.find(t => t.id === match.team2Id);
            const court = courts.find(c => c.id === match.courtId);

            return (
              <div
                key={match.id}
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                {/* Scheduled time */}
                <div className="shrink-0 text-center bg-gray-800 rounded-lg px-3 py-2 min-w-[56px]">
                  <span className="text-blue-400 font-mono font-bold text-lg leading-none">
                    {match.scheduledTime}
                  </span>
                </div>

                {/* Teams */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-white font-semibold text-sm truncate">
                    <span>{team1?.flag}</span>
                    <span className="truncate">{team1?.name}</span>
                    <span className="text-gray-500 mx-1 shrink-0">vs</span>
                    <span className="truncate">{team2?.name}</span>
                    <span>{team2?.flag}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs bg-blue-800 text-blue-200 font-bold px-1.5 py-0.5 rounded">
                      CAT {match.category}
                    </span>
                    {court && (
                      <span className="text-xs text-gray-500">{court.name}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Inner display (needs AppContext) ────────────────────────────────────────

function DisplayContent() {
  const { matches, teams, groups, standings, courts, event } = useApp();
  const now = useNow(1000);

  // Auto-refresh trigger every 30 s (re-renders naturally via useNow, but
  // we keep a dedicated counter for explicit re-fetch if needed in the future)
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">🎾</span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight truncate">
                {event?.name || 'Copa do Mundo Beach Tennis'}
              </h1>
              {event?.subtitle && (
                <p className="text-gray-400 text-sm truncate">{event.subtitle}</p>
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

      {/* ── Main ── */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <LiveSection matches={matches} teams={teams} courts={courts} />
        <StandingsSection groups={groups} teams={teams} standings={standings} />
        <UpcomingSection matches={matches} teams={teams} courts={courts} />
      </main>

      {/* ── Footer ── */}
      <footer className="text-center text-gray-700 text-xs py-4 border-t border-gray-900">
        Atualização automática a cada 30 segundos
      </footer>
    </div>
  );
}

// ─── Public export — wraps itself in AppProvider ──────────────────────────────

export function PublicDisplay() {
  return (
    <AppProvider>
      <DisplayContent />
    </AppProvider>
  );
}
