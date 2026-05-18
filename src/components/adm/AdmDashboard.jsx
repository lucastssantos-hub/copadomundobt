import { Trophy, Users, MapPin, Activity, CheckCircle, Clock, Play, Flag } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { MATCH_STATUS, CATEGORIES } from '../../data/mockData';
import { Card, CardBody } from '../common/Card';
import { StatusBadge } from '../common/Badge';

export function AdmDashboard() {
  const { event, matches, teams, groups, courts, toggleCategoryActive } = useApp();
  const activeCategories = event.activeCategories ?? CATEGORIES;

  const allGames = matches.flatMap(m => m.games);
  const stats = {
    total: matches.length,
    finished: matches.filter(m => m.status === MATCH_STATUS.FINISHED).length,
    inProgress: allGames.filter(g => g.status === MATCH_STATUS.IN_PROGRESS).length,
    warmingUp: allGames.filter(g => g.status === MATCH_STATUS.WARMING_UP).length,
    waitingResult: allGames.filter(g => g.status === MATCH_STATUS.WAITING_RESULT).length,
    waitingLineup: allGames.filter(g => g.status === MATCH_STATUS.WAITING_LINEUP).length,
  };

  const recentMatches = [...matches]
    .filter(m => m.status !== MATCH_STATUS.WAITING_LINEUP || m.games.some(g => g.status !== MATCH_STATUS.WAITING_LINEUP))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2.5 rounded-xl">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{event.name}</h1>
            <p className="text-blue-200 text-sm mt-0.5">{event.subtitle}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin size={14} className="text-blue-300" />
              <span className="text-blue-200 text-xs">{event.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categorias do Dia */}
      <Card>
        <CardBody className="p-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Categorias Ativas Hoje
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const isActive = activeCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategoryActive(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                  }`}
                >
                  CAT {cat}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Toque para ativar/bloquear • {activeCategories.length} de {CATEGORIES.length} ativas
          </p>
        </CardBody>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Users size={20} className="text-blue-600" />} label="Equipes" value={teams.length} bg="bg-blue-50" />
        <StatCard icon={<Flag size={20} className="text-purple-600" />} label="Grupos" value={groups.length} bg="bg-purple-50" />
        <StatCard icon={<Activity size={20} className="text-green-600" />} label="Confrontos" value={stats.total} bg="bg-green-50" />
        <StatCard icon={<Play size={20} className="text-orange-600" />} label="Em Jogo" value={stats.inProgress} bg="bg-orange-50" />
        <StatCard icon={<Clock size={20} className="text-yellow-600" />} label="Aquecendo" value={stats.warmingUp} bg="bg-yellow-50" />
        <StatCard icon={<CheckCircle size={20} className="text-emerald-600" />} label="Finalizados" value={stats.finished} bg="bg-emerald-50" />
      </div>

      {/* Active Games */}
      {(stats.inProgress > 0 || stats.warmingUp > 0) && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">Ao Vivo Agora</h2>
          <div className="space-y-2">
            {matches.map(match =>
              match.games
                .filter(g => [MATCH_STATUS.IN_PROGRESS, MATCH_STATUS.WARMING_UP].includes(g.status))
                .map(game => <LiveGameCard key={game.id} game={game} match={match} />)
            )}
          </div>
        </div>
      )}

      {/* Pending Validation */}
      {stats.waitingResult > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">
            Aguardando Validação
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{stats.waitingResult}</span>
          </h2>
          <div className="space-y-2">
            {matches.map(match =>
              match.games
                .filter(g => g.status === MATCH_STATUS.WAITING_RESULT)
                .map(game => <PendingResultCard key={game.id} game={game} match={match} />)
            )}
          </div>
        </div>
      )}

      {/* Recent Matches */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3">Confrontos Recentes</h2>
        <div className="space-y-2">
          {recentMatches.map(match => <MatchSummaryCard key={match.id} match={match} />)}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 p-3">
        <div className={`${bg} p-2.5 rounded-xl`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function LiveGameCard({ game, match }) {
  const { getTeamById, getCourtById } = useApp();
  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);
  const court = getCourtById(game.courtId);
  const typeLabels = { male: 'Masculino', female: 'Feminino', mixed: 'Misto' };

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardBody className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span>{team1?.flag} {team1?.name}</span>
            <span className="text-gray-400">vs</span>
            <span>{team2?.flag} {team2?.name}</span>
          </div>
          <StatusBadge status={game.status} />
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
          <span>{typeLabels[game.type]}</span>
          {court && <><span>•</span><span>{court.name}</span></>}
          <span className="ml-auto bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">CAT {match.category}</span>
        </div>
      </CardBody>
    </Card>
  );
}

function PendingResultCard({ game, match }) {
  const { getTeamById } = useApp();
  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);
  const typeLabels = { male: 'Masculino', female: 'Feminino', mixed: 'Misto' };

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardBody className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">
            {team1?.flag} {team1?.name} vs {team2?.flag} {team2?.name}
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            {game.pendingScore1} × {game.pendingScore2}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{typeLabels[game.type]} • CAT {match.category}</p>
      </CardBody>
    </Card>
  );
}

function MatchSummaryCard({ match }) {
  const { getTeamById } = useApp();
  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  return (
    <Card>
      <CardBody className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{team1?.flag} {team1?.name}</span>
            {match.result && (
              <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                {match.result.team1Score} × {match.result.team2Score}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-800">{team2?.name} {team2?.flag}</span>
          </div>
          <StatusBadge status={match.status} />
        </div>
        <p className="text-xs text-gray-500 mt-1">CAT {match.category} • {match.games.length} jogo(s)</p>
      </CardBody>
    </Card>
  );
}
