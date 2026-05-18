import { useState, useMemo } from 'react';
import { MapPin, Clock, AlertCircle, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { MATCH_STATUS, CATEGORIES } from '../../data/mockData';
import { Card, CardBody } from '../common/Card';
import { StatusBadge, CategoryBadge } from '../common/Badge';
import { MatchDetailModal } from './MatchDetailModal';

export function CaptainMatches() {
  const { user } = useAuth();
  const { matches, teams, groups, courts, standings, addAlert, event } = useApp();
  const activeCategories = event?.activeCategories ?? CATEGORIES;

  const [detailMatch, setDetailMatch]       = useState(null);
  const [showStandings, setShowStandings]   = useState(false);

  const myTeam       = teams.find(t => t.id === user.teamId);
  const myGroup      = groups.find(g => g.teamIds.includes(user.teamId));
  const allMyMatches = matches.filter(m => m.team1Id === user.teamId || m.team2Id === user.teamId);
  const myMatches    = allMyMatches.filter(m => activeCategories.includes(m.category));
  const blockedCats  = [...new Set(allMyMatches.filter(m => !activeCategories.includes(m.category)).map(m => m.category))];

  const typeLabels = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };

  // Pending actions for the alert banner
  const pendingActions = useMemo(() => {
    const result = [];
    for (const m of myMatches) {
      const isTeam1 = m.team1Id === user.teamId;
      for (const g of m.games) {
        const myLineup = isTeam1 ? g.lineup1 : g.lineup2;
        if (myLineup.length === 0 && [MATCH_STATUS.WAITING_LINEUP, MATCH_STATUS.LINEUP_SENT].includes(g.status)) {
          const opp = teams.find(t => t.id === (isTeam1 ? m.team2Id : m.team1Id));
          result.push({ type: 'lineup', label: typeLabels[g.type], opponent: opp?.name, matchId: m.id });
        }
        if (g.status === MATCH_STATUS.IN_PROGRESS) {
          const opp = teams.find(t => t.id === (isTeam1 ? m.team2Id : m.team1Id));
          result.push({ type: 'result', label: typeLabels[g.type], opponent: opp?.name, matchId: m.id });
        }
      }
    }
    return result;
  }, [myMatches, user.teamId, teams]);

  const handleLineupSubmitted = (match, game) => {
    const isTeam1 = match.team1Id === user.teamId;
    const opp = teams.find(t => t.id === (isTeam1 ? match.team2Id : match.team1Id));
    addAlert(`📋 ${myTeam?.flag} ${myTeam?.name} enviou escalação ${typeLabels[game.type]} vs ${opp?.name} (CAT ${match.category})`, 'lineup', 'admin');
  };

  const handleResultSubmitted = (match, game, score1, score2) => {
    const isTeam1 = match.team1Id === user.teamId;
    const opp = teams.find(t => t.id === (isTeam1 ? match.team2Id : match.team1Id));
    const myScore  = isTeam1 ? score1 : score2;
    const oppScore = isTeam1 ? score2 : score1;
    addAlert(`🏆 ${myTeam?.flag} ${myTeam?.name} enviou resultado ${typeLabels[game.type]}: ${myScore}×${oppScore} vs ${opp?.name}`, 'result', 'admin');
  };

  // Standings for this group
  const groupStandings = myGroup
    ? (standings[myGroup.id] || []).slice().sort((a, b) =>
        b.points - a.points || b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost))
    : [];

  return (
    <div className="space-y-3">

      {/* Pending actions alert */}
      {pendingActions.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 space-y-1">
          <p className="text-sm font-bold text-orange-800 flex items-center gap-1.5">
            <AlertCircle size={15} /> Ação necessária
          </p>
          {pendingActions.map((a, i) => (
            <button
              key={i}
              onClick={() => setDetailMatch(myMatches.find(m => m.id === a.matchId) ?? null)}
              className="w-full text-left text-xs text-orange-700 bg-orange-100 rounded-lg px-2.5 py-1.5 font-medium hover:bg-orange-200 transition-colors flex items-center justify-between"
            >
              <span>{a.type === 'lineup' ? '📋 Enviar escalação' : '🏆 Inserir resultado'} — {a.label} vs {a.opponent}</span>
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
      )}

      {/* Blocked categories notice */}
      {blockedCats.length > 0 && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-gray-400">🔒</span>
          <p className="text-xs text-gray-500">
            Categoria{blockedCats.length > 1 ? 's' : ''} {blockedCats.join(', ')} bloqueada{blockedCats.length > 1 ? 's' : ''} pelo ADM hoje
          </p>
        </div>
      )}

      {/* Match cards */}
      {myMatches.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-gray-500 py-8">Nenhum confronto ativo no momento.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {myMatches.map(match => {
            const isTeam1  = match.team1Id === user.teamId;
            const opponent = teams.find(t => t.id === (isTeam1 ? match.team2Id : match.team1Id));
            const court    = courts.find(c => c.id === match.courtId);
            const isFinished = match.status === MATCH_STATUS.FINISHED;

            // Show a dot if any action is pending for this match
            const hasPending = pendingActions.some(a => a.matchId === match.id);
            const isWarming  = match.games.some(g => g.status === MATCH_STATUS.WARMING_UP);

            return (
              <button
                key={match.id}
                onClick={() => setDetailMatch(match)}
                className="w-full text-left"
              >
                <Card className={`transition-all active:scale-99 ${hasPending ? 'border-orange-300' : ''} ${isWarming ? 'border-orange-400 shadow-orange-100 shadow-md' : ''}`}>
                  <CardBody className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Flags */}
                      <div className="flex items-center gap-1 text-2xl flex-shrink-0">
                        <span>{myTeam?.flag}</span>
                        <span className="text-gray-300 text-base">vs</span>
                        <span>{opponent?.flag}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm truncate">{opponent?.name}</span>
                          <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                            CAT {match.category}
                          </span>
                        </div>

                        {/* Result */}
                        {match.result && (
                          <p className="text-sm font-bold mt-0.5">
                            {isTeam1
                              ? `${match.result.team1Score} × ${match.result.team2Score}`
                              : `${match.result.team2Score} × ${match.result.team1Score}`}
                            {' '}
                            <span className="font-normal text-xs text-gray-500">
                              {match.result.team1Score !== match.result.team2Score
                                ? ((match.result.team1Score > match.result.team2Score) === isTeam1 ? '🏆 Vitória' : '❌ Derrota')
                                : '🤝 Empate'}
                            </span>
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge status={match.status} />
                          {isWarming && (
                            <span className="text-xs font-semibold text-orange-600 animate-pulse">⏱ Aquecendo</span>
                          )}
                          {court && (
                            <span className="text-xs text-gray-500 flex items-center gap-0.5">
                              <MapPin size={10} /> {court.name}
                            </span>
                          )}
                          {match.scheduledTime && (
                            <span className="text-xs text-gray-500 flex items-center gap-0.5">
                              <Clock size={10} /> {match.scheduledTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Indicators */}
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        {hasPending && (
                          <span className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                        )}
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* Standings — collapsible */}
      {groupStandings.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowStandings(s => !s)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trophy size={15} className="text-yellow-500" />
              Classificação — {myGroup?.name}
            </span>
            {showStandings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showStandings && (
            <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Equipe</th>
                      <th className="px-2 py-2 text-center">J</th>
                      <th className="px-2 py-2 text-center">V</th>
                      <th className="px-2 py-2 text-center">D</th>
                      <th className="px-2 py-2 text-center font-bold text-gray-700">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStandings.map((s, idx) => {
                      const team = teams.find(t => t.id === s.teamId);
                      const isMe = s.teamId === user.teamId;
                      return (
                        <tr key={s.teamId} className={`border-b border-gray-100 last:border-0 ${isMe ? 'bg-blue-50' : idx < 2 && s.played > 0 ? 'bg-green-50/40' : ''}`}>
                          <td className="px-3 py-2.5">
                            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span>{team?.flag}</span>
                              <span className={`font-semibold text-xs ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>{team?.name}</span>
                              {isMe && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Você</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center text-gray-600 text-xs">{s.played}</td>
                          <td className="px-2 py-2.5 text-center text-green-600 font-semibold text-xs">{s.wins}</td>
                          <td className="px-2 py-2.5 text-center text-red-500 text-xs">{s.losses}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-gray-900">{s.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 px-3 py-1.5 border-t border-gray-100">J=Jogos V=Vitórias D=Derrotas PTS=Pontos</p>
            </div>
          )}
        </div>
      )}

      {/* Match detail modal */}
      {detailMatch && (
        <MatchDetailModal
          match={detailMatch}
          onClose={() => setDetailMatch(null)}
          onLineupSubmitted={handleLineupSubmitted}
          onResultSubmitted={handleResultSubmitted}
        />
      )}
    </div>
  );
}
