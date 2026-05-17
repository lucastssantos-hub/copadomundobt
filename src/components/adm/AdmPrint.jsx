import { useApp } from '../../contexts/AppContext';
import { MATCH_STATUS } from '../../data/mockData';
import { Button } from '../common/Button';
import { Printer } from 'lucide-react';

export function AdmPrint() {
  const { groups, teams, standings, matches, event } = useApp();
  const eliminationMatches = matches.filter(m => m.phase === 'elimination');

  const sortedStandings = (groupId) =>
    (standings[groupId] || []).slice().sort((a, b) =>
      b.points - a.points || b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost)
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-xl font-bold text-gray-900">Impressão</h2>
        <Button onClick={() => window.print()} variant="primary">
          <Printer size={16} className="mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <p className="text-sm text-gray-500 print:hidden">
        Clique em "Imprimir" para gerar o PDF ou enviar para a impressora. A navegação e os botões não aparecerão na impressão.
      </p>

      {/* Printable Content */}
      <div id="print-area" className="space-y-6">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 hidden print:block">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-gray-600">{event.subtitle} — {event.location}</p>
        </div>

        {/* Group Standings */}
        {groups.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 print:border-gray-800">
              Fase de Grupos — Classificação
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
              {groups.map(group => {
                const gs = sortedStandings(group.id);
                return (
                  <div key={group.id} className="border border-gray-200 rounded-xl print:border-gray-400 print:rounded-none overflow-hidden">
                    <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                      <span className="font-bold text-sm">{group.name}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">CAT {group.category}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                          <th className="text-left px-3 py-2">#</th>
                          <th className="text-left px-3 py-2">Equipe</th>
                          <th className="px-2 py-2 text-center">J</th>
                          <th className="px-2 py-2 text-center">V</th>
                          <th className="px-2 py-2 text-center">D</th>
                          <th className="px-2 py-2 text-center">JG</th>
                          <th className="px-2 py-2 text-center font-bold text-gray-700">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gs.map((s, idx) => {
                          const team = teams.find(t => t.id === s.teamId);
                          return (
                            <tr key={s.teamId} className={`border-b border-gray-100 last:border-0 ${idx < 2 && s.played > 0 ? 'bg-green-50' : ''}`}>
                              <td className="px-3 py-2 text-center">
                                <span className={`w-5 h-5 rounded-full text-xs font-bold inline-flex items-center justify-center ${
                                  idx === 0 ? 'bg-yellow-400 text-white' :
                                  idx === 1 ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>{idx + 1}</span>
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-800">
                                <span className="mr-1">{team?.flag}</span>{team?.name}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-600">{s.played}</td>
                              <td className="px-2 py-2 text-center text-green-600 font-semibold">{s.wins}</td>
                              <td className="px-2 py-2 text-center text-red-500">{s.losses}</td>
                              <td className="px-2 py-2 text-center text-gray-600">{s.gamesWon}/{s.gamesLost}</td>
                              <td className="px-2 py-2 text-center font-bold text-gray-900">{s.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200">
                      <p className="text-xs text-gray-400">🟢 Top 2 classificados para eliminatórias</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match Results */}
        {matches.filter(m => m.status === MATCH_STATUS.FINISHED && m.phase !== 'elimination').length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
              Resultados — Fase de Grupos
            </h3>
            <div className="space-y-2">
              {matches
                .filter(m => m.status === MATCH_STATUS.FINISHED && m.phase !== 'elimination')
                .map(match => {
                  const t1 = teams.find(t => t.id === match.team1Id);
                  const t2 = teams.find(t => t.id === match.team2Id);
                  return (
                    <div key={match.id} className="border border-gray-200 rounded-xl overflow-hidden print:rounded-none">
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <span className="text-sm font-bold text-gray-800">
                          {t1?.flag} {t1?.name} <span className="font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded mx-1">{match.result?.team1Score} × {match.result?.team2Score}</span> {t2?.name} {t2?.flag}
                        </span>
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-medium">CAT {match.category}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {match.games.map(game => {
                          const won1 = game.score1 > game.score2;
                          const typeL = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };
                          return (
                            <div key={game.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                              <span className="text-gray-500 w-24">{typeL[game.type]}</span>
                              <span className={`font-bold ${won1 ? 'text-green-700' : 'text-gray-500'}`}>{t1?.flag} {game.score1}</span>
                              <span className="text-gray-400 text-xs">×</span>
                              <span className={`font-bold ${!won1 ? 'text-green-700' : 'text-gray-500'}`}>{game.score2} {t2?.flag}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Elimination Bracket */}
        {eliminationMatches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
              Fase Eliminatória
            </h3>
            <div className="space-y-2">
              {eliminationMatches.map(match => {
                const t1 = teams.find(t => t.id === match.team1Id);
                const t2 = teams.find(t => t.id === match.team2Id);
                return (
                  <div key={match.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 print:rounded-none">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t1?.flag}</span>
                      <span className="font-bold text-gray-800">{t1?.name}</span>
                    </div>
                    <div className="text-center">
                      {match.result ? (
                        <span className="font-bold text-gray-900 bg-gray-900 text-white px-3 py-1 rounded text-sm">
                          {match.result.team1Score} × {match.result.team2Score}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 border border-dashed border-gray-300 px-4 py-1 rounded">vs</span>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">CAT {match.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{t2?.name}</span>
                      <span className="text-lg">{t2?.flag}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Printer size={40} className="mx-auto mb-3" />
            <p>Nenhum dado disponível para impressão.</p>
            <p className="text-sm">Cadastre grupos e jogue as partidas primeiro.</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          nav, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
