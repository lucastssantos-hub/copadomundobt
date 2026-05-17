import { MATCH_STATUS } from '../../data/mockData';

const typeOrder = ['male', 'female', 'mixed'];
const typeLabels = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };

export function MatchScoreHistory({ match, team1, team2, myTeamId }) {
  if (!match || match.status !== MATCH_STATUS.FINISHED) return null;

  const orderedGames = typeOrder
    .map(type => match.games.find(g => g.type === type))
    .filter(Boolean);

  const isMyTeam1 = myTeamId ? match.team1Id === myTeamId : true;

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden mt-2">
      <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Histórico de Jogos</span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{team1?.flag} {team1?.name}</span>
          <span className="font-bold text-gray-800 bg-gray-900 text-white px-2 py-0.5 rounded text-xs">
            {match.result?.team1Score} × {match.result?.team2Score}
          </span>
          <span>{team2?.name} {team2?.flag}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-200/60">
        {orderedGames.map(game => {
          const won1 = game.score1 > game.score2;
          const won2 = game.score2 > game.score1;
          const myWon = myTeamId ? (isMyTeam1 ? won1 : won2) : null;

          return (
            <div key={game.id} className="flex items-center px-3 py-2.5 gap-2">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">{typeLabels[game.type]}</span>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className={`text-sm font-bold ${won1 ? 'text-green-700' : 'text-gray-600'}`}>
                  {team1?.flag}
                </span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold ${
                  won1 ? 'bg-green-100 text-green-800' :
                  won2 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  <span>{game.score1}</span>
                  <span className="text-gray-400 font-normal">×</span>
                  <span>{game.score2}</span>
                </div>
                <span className={`text-sm font-bold ${won2 ? 'text-green-700' : 'text-gray-600'}`}>
                  {team2?.flag}
                </span>
              </div>
              {myTeamId && myWon !== null && (
                <span className={`text-xs font-semibold flex-shrink-0 ${myWon ? 'text-green-600' : won1 === won2 ? 'text-gray-500' : 'text-red-500'}`}>
                  {myWon ? '🏆' : won1 === won2 ? '—' : '❌'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
