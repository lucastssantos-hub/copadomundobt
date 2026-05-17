import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { MATCH_STATUS } from '../../data/mockData';
import { Card, CardBody } from '../common/Card';
import { StatusBadge, CategoryBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { WarmupTimer } from '../common/Timer';
import { LineupModal } from './LineupModal';
import { ResultModal } from './ResultModal';
import { MatchScoreHistory } from '../common/MatchScoreHistory';

export function CaptainMatches() {
  const { user } = useAuth();
  const { matches, teams, groups, courts, addAlert } = useApp();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [lineupModal, setLineupModal] = useState(null);
  const [resultModal, setResultModal] = useState(null);

  const myTeam = teams.find(t => t.id === user.teamId);
  const myGroup = groups.find(g => g.teamIds.includes(user.teamId));
  const myMatches = matches.filter(m => m.team1Id === user.teamId || m.team2Id === user.teamId);

  const typeLabels = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };

  const canEditLineup = (game, match) => {
    const isMyTeam1 = match.team1Id === user.teamId;
    const isMyTeam2 = match.team2Id === user.teamId;
    if (!isMyTeam1 && !isMyTeam2) return false;
    const myLineup = isMyTeam1 ? game.lineup1 : game.lineup2;
    return myLineup.length === 0 && [MATCH_STATUS.WAITING_LINEUP, MATCH_STATUS.LINEUP_SENT].includes(game.status);
  };

  const canSubmitResult = (game) => game.status === MATCH_STATUS.IN_PROGRESS;

  const isTied = (match) => {
    const male = match.games.find(g => g.type === 'male');
    const female = match.games.find(g => g.type === 'female');
    if (!male || !female) return false;
    if (male.status !== MATCH_STATUS.FINISHED || female.status !== MATCH_STATUS.FINISHED) return false;
    const malWin = (match.team1Id === user.teamId) ? male.score1 > male.score2 : male.score2 > male.score1;
    const femWin = (match.team1Id === user.teamId) ? female.score1 > female.score2 : female.score2 > female.score1;
    return malWin !== femWin;
  };

  const handleLineupSubmitted = (match, game) => {
    const opponent = teams.find(t => t.id === (match.team1Id === user.teamId ? match.team2Id : match.team1Id));
    addAlert(
      `📋 ${myTeam?.flag} ${myTeam?.name} enviou escalação ${typeLabels[game.type]} vs ${opponent?.name} (CAT ${match.category})`,
      'lineup',
      'admin'
    );
  };

  const handleResultSubmitted = (match, game, score1, score2) => {
    const opponent = teams.find(t => t.id === (match.team1Id === user.teamId ? match.team2Id : match.team1Id));
    const isTeam1 = match.team1Id === user.teamId;
    const myScore = isTeam1 ? score1 : score2;
    const oppScore = isTeam1 ? score2 : score1;
    addAlert(
      `🏆 ${myTeam?.flag} ${myTeam?.name} enviou resultado ${typeLabels[game.type]}: ${myScore}×${oppScore} vs ${opponent?.name}`,
      'result',
      'admin'
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Meus Confrontos</h2>
      {myGroup && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700 font-medium">{myGroup.name} • Categoria {myGroup.category}</p>
        </div>
      )}

      {myMatches.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhum confronto programado.</p></CardBody></Card>
      ) : (
        <div className="space-y-2">
          {myMatches.map(match => {
            const isTeam1 = match.team1Id === user.teamId;
            const opponent = teams.find(t => t.id === (isTeam1 ? match.team2Id : match.team1Id));
            const court = courts.find(c => c.id === match.courtId);
            const isExpanded = selectedMatch?.id === match.id;
            const tied = isTied(match);
            const isFinished = match.status === MATCH_STATUS.FINISHED;

            return (
              <Card key={match.id}>
                <CardBody className="p-3" onClick={() => setSelectedMatch(isExpanded ? null : match)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">{myTeam?.flag} vs {opponent?.flag}</span>
                        <span className="font-bold text-gray-900 text-sm">{opponent?.name}</span>
                      </div>
                      {match.result && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold bg-gray-900 text-white px-2 py-0.5 rounded">
                            {isTeam1 ? `${match.result.team1Score} × ${match.result.team2Score}` : `${match.result.team2Score} × ${match.result.team1Score}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            {match.result.team1Score > match.result.team2Score
                              ? (isTeam1 ? '🏆 Vitória' : '❌ Derrota')
                              : match.result.team2Score > match.result.team1Score
                              ? (isTeam1 ? '❌ Derrota' : '🏆 Vitória')
                              : '🤝 Empate'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <CategoryBadge category={match.category} />
                        <StatusBadge status={match.status} />
                        {court && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {court.name}</span>}
                        {match.scheduledTime && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {match.scheduledTime}</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </CardBody>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 pb-3 space-y-3">
                    {/* Detailed score history for finished matches */}
                    {isFinished && (
                      <MatchScoreHistory
                        match={match}
                        team1={teams.find(t => t.id === match.team1Id)}
                        team2={teams.find(t => t.id === match.team2Id)}
                        myTeamId={user.teamId}
                      />
                    )}

                    {!isFinished && match.games.map(game => {
                      if (game.type === 'mixed' && !tied && game.status === MATCH_STATUS.WAITING_LINEUP) return null;
                      const myLineup = isTeam1 ? game.lineup1 : game.lineup2;
                      const myScore = isTeam1 ? game.score1 : game.score2;
                      const oppScore = isTeam1 ? game.score2 : game.score1;

                      return (
                        <div key={game.id} className="bg-gray-50 rounded-xl p-3 space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-800">{typeLabels[game.type]}</span>
                            <StatusBadge status={game.status} />
                          </div>

                          {game.status === MATCH_STATUS.WARMING_UP && (
                            <WarmupTimer startedAt={game.warmupStartedAt} />
                          )}

                          {(game.score1 !== null || game.pendingScore1 !== null) && (
                            <div className="text-center py-2">
                              <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">{myTeam?.name}</p>
                                  <p className="text-3xl font-bold text-gray-900">{myScore ?? (isTeam1 ? game.pendingScore1 : game.pendingScore2)}</p>
                                </div>
                                <span className="text-gray-300 text-xl">×</span>
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">{opponent?.name}</p>
                                  <p className="text-3xl font-bold text-gray-900">{oppScore ?? (isTeam1 ? game.pendingScore2 : game.pendingScore1)}</p>
                                </div>
                              </div>
                              {game.pendingScore1 !== null && <p className="text-xs text-yellow-600 mt-1">Aguardando validação do ADM</p>}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {canEditLineup(game, match) && (
                              <Button size="sm" variant="primary" fullWidth onClick={() => setLineupModal({ match, game, isTeam1 })}>
                                Escalar {typeLabels[game.type]}
                              </Button>
                            )}
                            {myLineup.length > 0 && game.status !== MATCH_STATUS.FINISHED && (
                              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 text-xs text-green-700 font-medium text-center">
                                ✓ Escalação enviada ({myLineup.length} atleta(s))
                              </div>
                            )}
                            {canSubmitResult(game) && (
                              <Button size="sm" variant="success" fullWidth onClick={() => setResultModal({ match, game, isTeam1 })}>
                                Inserir Resultado
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {tied && !isFinished && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-sm font-semibold text-orange-800">⚥ Confronto empatado 1×1</p>
                        <p className="text-xs text-orange-600 mt-0.5">Jogo misto disponível para escalação</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <LineupModal
        isOpen={!!lineupModal}
        onClose={() => setLineupModal(null)}
        match={lineupModal?.match}
        game={lineupModal?.game}
        isTeam1={lineupModal?.isTeam1}
        onSubmitted={handleLineupSubmitted}
      />
      <ResultModal
        isOpen={!!resultModal}
        onClose={() => setResultModal(null)}
        match={resultModal?.match}
        game={resultModal?.game}
        isTeam1={resultModal?.isTeam1}
        onSubmitted={handleResultSubmitted}
      />
    </div>
  );
}
