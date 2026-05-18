import { useState } from 'react';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { MATCH_STATUS } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { WarmupTimer } from '../common/Timer';
import { MatchScoreHistory } from '../common/MatchScoreHistory';
import { LineupModal } from './LineupModal';
import { ResultModal } from './ResultModal';

const TYPE_LABEL = { male: 'Masculino', female: 'Feminino', mixed: 'Misto' };
const TYPE_ICON  = { male: '♂', female: '♀', mixed: '⚥' };

export function MatchDetailModal({ match, onClose, onLineupSubmitted, onResultSubmitted }) {
  const { user } = useAuth();
  const { teams, athletes, courts } = useApp();
  const [lineupModal, setLineupModal] = useState(null);
  const [resultModal, setResultModal] = useState(null);

  if (!match) return null;

  const isTeam1   = match.team1Id === user.teamId;
  const myTeam    = teams.find(t => t.id === (isTeam1 ? match.team1Id : match.team2Id));
  const opponent  = teams.find(t => t.id === (isTeam1 ? match.team2Id : match.team1Id));
  const court     = courts.find(c => c.id === match.courtId);
  const isFinished = match.status === MATCH_STATUS.FINISHED;

  const isTied = () => {
    const male   = match.games.find(g => g.type === 'male');
    const female = match.games.find(g => g.type === 'female');
    if (!male || !female) return false;
    if (male.status !== MATCH_STATUS.FINISHED || female.status !== MATCH_STATUS.FINISHED) return false;
    const malWin = isTeam1 ? male.score1 > male.score2 : male.score2 > male.score1;
    const femWin = isTeam1 ? female.score1 > female.score2 : female.score2 > female.score1;
    return malWin !== femWin;
  };
  const tied = isTied();

  const warmingGame = match.games.find(g => g.status === MATCH_STATUS.WARMING_UP);

  const canEditLineup = (game) => {
    const myLineup = isTeam1 ? game.lineup1 : game.lineup2;
    return myLineup.length === 0 &&
      [MATCH_STATUS.WAITING_LINEUP, MATCH_STATUS.LINEUP_SENT].includes(game.status);
  };

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={`${myTeam?.flag} vs ${opponent?.flag} ${opponent?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Category + status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold bg-blue-600 text-white px-3 py-1 rounded-full">
              CAT {match.category}
            </span>
            <StatusBadge status={match.status} />
            {match.result && (
              <span className="ml-auto text-sm font-bold bg-gray-900 text-white px-2.5 py-1 rounded-lg">
                {isTeam1
                  ? `${match.result.team1Score} × ${match.result.team2Score}`
                  : `${match.result.team2Score} × ${match.result.team1Score}`}
              </span>
            )}
          </div>

          {/* Court info */}
          {court && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <MapPin size={18} className="text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{court.name}</p>
                {court.location && <p className="text-xs text-gray-500">{court.location}</p>}
              </div>
              {match.scheduledTime && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock size={14} />
                  <span className="text-sm font-medium">{match.scheduledTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Warmup timer — full size when active */}
          {warmingGame && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {TYPE_ICON[warmingGame.type]} Aquecimento — {TYPE_LABEL[warmingGame.type]}
              </p>
              <WarmupTimer startedAt={warmingGame.warmupStartedAt} />
            </div>
          )}

          {/* Score history for finished matches */}
          {isFinished && (
            <MatchScoreHistory
              match={match}
              team1={teams.find(t => t.id === match.team1Id)}
              team2={teams.find(t => t.id === match.team2Id)}
              myTeamId={user.teamId}
            />
          )}

          {/* Games */}
          {!isFinished && match.games.map(game => {
            if (game.type === 'mixed' && !tied && game.status === MATCH_STATUS.WAITING_LINEUP) return null;

            const myLineup  = isTeam1 ? game.lineup1 : game.lineup2;
            const myScore   = isTeam1 ? game.score1  : game.score2;
            const oppScore  = isTeam1 ? game.score2  : game.score1;
            const hasPending = game.pendingScore1 !== null;

            return (
              <div key={game.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Game header */}
                <div className={`flex items-center justify-between px-3 py-2.5 ${
                  game.status === MATCH_STATUS.WARMING_UP ? 'bg-orange-50' :
                  game.status === MATCH_STATUS.IN_PROGRESS ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <span className="font-bold text-gray-800 text-sm">
                    {TYPE_ICON[game.type]} {TYPE_LABEL[game.type]}
                  </span>
                  <StatusBadge status={game.status} />
                </div>

                <div className="px-3 py-3 space-y-3">
                  {/* Score display */}
                  {(myScore !== null || hasPending) && (
                    <div className="flex items-center justify-center gap-6 py-1">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">{myTeam?.name}</p>
                        <p className="text-4xl font-bold text-gray-900">
                          {myScore ?? (isTeam1 ? game.pendingScore1 : game.pendingScore2)}
                        </p>
                      </div>
                      <span className="text-2xl text-gray-200 font-light">×</span>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">{opponent?.name}</p>
                        <p className="text-4xl font-bold text-gray-900">
                          {oppScore ?? (isTeam1 ? game.pendingScore2 : game.pendingScore1)}
                        </p>
                      </div>
                    </div>
                  )}
                  {hasPending && (
                    <p className="text-xs text-yellow-600 text-center">⏳ Aguardando validação do ADM</p>
                  )}

                  {/* Lineup info */}
                  {myLineup.length > 0 && game.status !== MATCH_STATUS.FINISHED && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-green-700 mb-1">✓ Escalação enviada</p>
                      <div className="flex gap-3">
                        {myLineup.map(id => {
                          const a = athletes.find(x => x.id === id);
                          return a ? (
                            <div key={id} className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-green-200 text-green-800 text-xs font-bold flex items-center justify-center">
                                {a.number || '#'}
                              </span>
                              <span className="text-xs text-green-800 font-medium">{a.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {canEditLineup(game) && (
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setLineupModal({ match, game, isTeam1 })}
                    >
                      Escalar {TYPE_ICON[game.type]} {TYPE_LABEL[game.type]}
                    </Button>
                  )}
                  {game.status === MATCH_STATUS.IN_PROGRESS && (
                    <Button
                      variant="success"
                      fullWidth
                      onClick={() => setResultModal({ match, game, isTeam1 })}
                    >
                      Inserir Resultado
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {tied && !isFinished && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <p className="font-semibold text-orange-800 text-sm">⚥ Confronto empatado 1×1</p>
              <p className="text-xs text-orange-600 mt-0.5">Jogo misto disponível — escale acima</p>
            </div>
          )}
        </div>
      </Modal>

      <LineupModal
        isOpen={!!lineupModal}
        onClose={() => setLineupModal(null)}
        match={lineupModal?.match}
        game={lineupModal?.game}
        isTeam1={lineupModal?.isTeam1}
        onSubmitted={(m, g) => { onLineupSubmitted?.(m, g); setLineupModal(null); }}
      />
      <ResultModal
        isOpen={!!resultModal}
        onClose={() => setResultModal(null)}
        match={resultModal?.match}
        game={resultModal?.game}
        isTeam1={resultModal?.isTeam1}
        onSubmitted={(m, g, s1, s2) => { onResultSubmitted?.(m, g, s1, s2); setResultModal(null); }}
      />
    </>
  );
}
