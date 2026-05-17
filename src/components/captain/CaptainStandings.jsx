import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { Card, CardBody, CardHeader } from '../common/Card';
import { CategoryBadge } from '../common/Badge';
import { Trophy } from 'lucide-react';

export function CaptainStandings() {
  const { user } = useAuth();
  const { groups, teams, standings } = useApp();

  const myGroup = groups.find(g => g.teamIds.includes(user.teamId));

  if (!myGroup) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Classificação</h2>
        <Card><CardBody><p className="text-center text-gray-500 py-8">Você não está em nenhum grupo ainda.</p></CardBody></Card>
      </div>
    );
  }

  const groupStandings = (standings[myGroup.id] || []).sort((a, b) =>
    b.points - a.points || b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Classificação</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            <h3 className="font-bold text-gray-900">{myGroup.name}</h3>
            <CategoryBadge category={myGroup.category} />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Equipe</th>
                  <th className="px-3 py-2.5 text-center">J</th>
                  <th className="px-3 py-2.5 text-center">V</th>
                  <th className="px-3 py-2.5 text-center">D</th>
                  <th className="px-3 py-2.5 text-center">JG</th>
                  <th className="px-3 py-2.5 text-center font-bold text-gray-700">PTS</th>
                </tr>
              </thead>
              <tbody>
                {groupStandings.map((standing, idx) => {
                  const team = teams.find(t => t.id === standing.teamId);
                  const isMe = standing.teamId === user.teamId;
                  const isQualified = idx < 2;

                  return (
                    <tr key={standing.teamId} className={`border-b border-gray-100 last:border-0 ${isMe ? 'bg-blue-50' : isQualified && standing.played > 0 ? 'bg-green-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                          idx === 0 ? 'bg-yellow-400 text-white' :
                          idx === 1 ? 'bg-gray-400 text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{team?.flag}</span>
                          <span className={`font-semibold ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>{team?.name}</span>
                          {isMe && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Você</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">{standing.played}</td>
                      <td className="px-3 py-3 text-center text-green-600 font-semibold">{standing.wins}</td>
                      <td className="px-3 py-3 text-center text-red-500">{standing.losses}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{standing.gamesWon}/{standing.gamesLost}</td>
                      <td className="px-3 py-3 text-center font-bold text-gray-900 text-base">{standing.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">
            J=Jogos V=Vitórias D=Derrotas JG=Jogos Ganhos/Perdidos PTS=Pontos
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
