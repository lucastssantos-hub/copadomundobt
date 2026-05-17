import { useApp } from '../../contexts/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../common/Card';
import { CategoryBadge } from '../common/Badge';
import { useState } from 'react';
import { Trophy } from 'lucide-react';

export function AdmStandings() {
  const { groups, teams, standings } = useApp();
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredGroups = filterCategory === 'all' ? groups : groups.filter(g => g.category === filterCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Classificação</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {cat === 'all' ? 'Todas' : `Cat ${cat}`}
          </button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhum grupo encontrado.</p></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const groupStandings = (standings[group.id] || []).sort((a, b) => b.points - a.points || b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
            return (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    <h3 className="font-bold text-gray-900">{group.name}</h3>
                    <CategoryBadge category={group.category} />
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
                          <th className="px-3 py-2.5 text-center">JG+</th>
                          <th className="px-3 py-2.5 text-center">JG-</th>
                          <th className="px-3 py-2.5 text-center font-bold text-gray-700">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings.map((standing, idx) => {
                          const team = teams.find(t => t.id === standing.teamId);
                          const isQualified = idx < 2 && standing.played > 0;
                          return (
                            <tr key={standing.teamId} className={`border-b border-gray-100 last:border-0 ${isQualified ? 'bg-green-50/40' : ''}`}>
                              <td className="px-4 py-3">
                                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                  idx === 0 ? 'bg-yellow-400 text-white' :
                                  idx === 1 ? 'bg-gray-400 text-white' :
                                  idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>{idx + 1}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{team?.flag}</span>
                                  <span className="font-semibold text-gray-800">{team?.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-gray-600">{standing.played}</td>
                              <td className="px-3 py-3 text-center text-green-600 font-semibold">{standing.wins}</td>
                              <td className="px-3 py-3 text-center text-red-500">{standing.losses}</td>
                              <td className="px-3 py-3 text-center text-gray-600">{standing.gamesWon}</td>
                              <td className="px-3 py-3 text-center text-gray-600">{standing.gamesLost}</td>
                              <td className="px-3 py-3 text-center font-bold text-gray-900 text-base">{standing.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">
                    🟢 Classificados para eliminatórias
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
