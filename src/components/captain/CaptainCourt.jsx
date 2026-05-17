import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { MATCH_STATUS } from '../../data/mockData';
import { MapPin, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '../common/Card';
import { StatusBadge } from '../common/Badge';
import { WarmupTimer } from '../common/Timer';

export function CaptainCourt() {
  const { user } = useAuth();
  const { matches, teams, courts } = useApp();

  const activeGames = [];
  matches
    .filter(m => m.team1Id === user.teamId || m.team2Id === user.teamId)
    .forEach(match => {
      match.games.forEach(game => {
        if ([MATCH_STATUS.WARMING_UP, MATCH_STATUS.IN_PROGRESS, MATCH_STATUS.LINEUP_SENT].includes(game.status)) {
          activeGames.push({ game, match });
        }
      });
    });

  const typeLabels = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };

  if (activeGames.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Quadra Atual</h2>
        <Card>
          <CardBody>
            <div className="text-center py-10">
              <MapPin size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma quadra ativa no momento</p>
              <p className="text-gray-400 text-sm mt-1">Aguarde a liberação do ADM</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Quadra Atual</h2>
      {activeGames.map(({ game, match }) => {
        const court = courts.find(c => c.id === game.courtId);
        const team1 = teams.find(t => t.id === match.team1Id);
        const team2 = teams.find(t => t.id === match.team2Id);
        const isTeam1 = match.team1Id === user.teamId;

        return (
          <Card key={game.id} className="border-2 border-blue-200">
            <CardBody className="space-y-4">
              {/* Court Info */}
              {court ? (
                <div className="bg-blue-600 rounded-2xl p-4 text-white text-center">
                  <MapPin size={24} className="mx-auto mb-2" />
                  <h3 className="text-2xl font-bold">{court.name}</h3>
                  <p className="text-blue-200 text-sm mt-1">{court.location}</p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                  <AlertCircle size={24} className="text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800 font-semibold">Quadra não definida</p>
                  <p className="text-yellow-600 text-sm">Aguardando definição do ADM</p>
                </div>
              )}

              {/* Match Info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{typeLabels[game.type]}</span>
                  <StatusBadge status={game.status} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-center">
                    <p className="text-2xl">{team1?.flag}</p>
                    <p className={`text-sm font-bold ${isTeam1 ? 'text-blue-600' : 'text-gray-800'}`}>{team1?.name}</p>
                    {isTeam1 && <p className="text-xs text-blue-500">Você</p>}
                  </div>
                  <span className="text-gray-400 font-bold">vs</span>
                  <div className="text-center">
                    <p className="text-2xl">{team2?.flag}</p>
                    <p className={`text-sm font-bold ${!isTeam1 ? 'text-blue-600' : 'text-gray-800'}`}>{team2?.name}</p>
                    {!isTeam1 && <p className="text-xs text-blue-500">Você</p>}
                  </div>
                </div>
              </div>

              {/* Warmup Timer */}
              {game.status === MATCH_STATUS.WARMING_UP && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cronômetro de Aquecimento</p>
                  <WarmupTimer startedAt={game.warmupStartedAt} />
                </div>
              )}

              {game.status === MATCH_STATUS.IN_PROGRESS && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-700 font-bold">🎾 Jogo em andamento!</p>
                  <p className="text-green-600 text-sm mt-1">Insira o resultado ao finalizar</p>
                </div>
              )}

              {game.status === MATCH_STATUS.LINEUP_SENT && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-yellow-700 font-bold">⏳ Aguardando liberação da quadra</p>
                  <p className="text-yellow-600 text-sm mt-1">O ADM irá liberar em breve</p>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
