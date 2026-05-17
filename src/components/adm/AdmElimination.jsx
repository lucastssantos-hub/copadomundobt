import { useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES, MATCH_STATUS } from '../../data/mockData';
import { Card, CardBody } from '../common/Card';
import { Button } from '../common/Button';
import { CategoryBadge } from '../common/Badge';

export function AdmElimination() {
  const { groups, teams, standings, matches, addMatch, addNotification } = useApp();
  const [generatedBrackets, setGeneratedBrackets] = useState({});

  const generateBracket = (category) => {
    const categoryGroups = groups.filter(g => g.category === category);
    if (categoryGroups.length === 0) {
      addNotification('Nenhum grupo nesta categoria', 'error');
      return;
    }

    const allFinished = categoryGroups.every(group => {
      const groupMatches = matches.filter(m => m.groupId === group.id);
      return groupMatches.length > 0 && groupMatches.every(m => m.status === MATCH_STATUS.FINISHED);
    });

    if (!allFinished) {
      addNotification('Nem todos os jogos da fase de grupos estão finalizados', 'warning');
    }

    const qualifiedTeams = [];
    categoryGroups.forEach(group => {
      const groupStandings = (standings[group.id] || []).sort((a, b) => b.points - a.points || b.wins - a.wins);
      qualifiedTeams.push(...groupStandings.slice(0, 2).map(s => ({ ...s, groupId: group.id })));
    });

    if (qualifiedTeams.length < 2) {
      addNotification('Não há equipes suficientes classificadas', 'error');
      return;
    }

    const bracket = [];
    for (let i = 0; i < qualifiedTeams.length - 1; i += 2) {
      bracket.push({
        team1: qualifiedTeams[i],
        team2: qualifiedTeams[i + 1],
        round: 'Semi-Final',
      });
    }

    setGeneratedBrackets(prev => ({ ...prev, [category]: bracket }));
    addNotification(`Chave eliminatória gerada para Categoria ${category}!`, 'success');
  };

  const confirmBracket = (category) => {
    const bracket = generatedBrackets[category];
    if (!bracket) return;

    const categoryGroups = groups.filter(g => g.category === category);
    const firstGroup = categoryGroups[0];

    bracket.forEach(matchup => {
      addMatch({
        groupId: firstGroup?.id || null,
        category,
        phase: 'elimination',
        team1Id: matchup.team1.teamId,
        team2Id: matchup.team2.teamId,
        courtId: null,
        scheduledTime: '',
      });
    });

    setGeneratedBrackets(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
    addNotification('Confrontos eliminatórios criados!', 'success');
  };

  const eliminationMatches = matches.filter(m => m.phase === 'elimination');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={20} className="text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Eliminatórias</h2>
      </div>

      {/* Generate by category */}
      <div className="space-y-3">
        {CATEGORIES.map(category => {
          const categoryGroups = groups.filter(g => g.category === category);
          if (categoryGroups.length === 0) return null;
          const existingElimination = eliminationMatches.filter(m => m.category === category);
          const bracket = generatedBrackets[category];

          return (
            <Card key={category}>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={category} />
                    <span className="text-sm text-gray-600">{categoryGroups.length} grupo(s)</span>
                  </div>
                  {existingElimination.length === 0 && !bracket && (
                    <Button size="sm" variant="warning" onClick={() => generateBracket(category)}>
                      <Zap size={14} className="mr-1" /> Gerar Chave
                    </Button>
                  )}
                </div>

                {bracket && (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                        <AlertCircle size={14} /> Prévia da Chave Eliminatória
                      </p>
                      {bracket.map((matchup, idx) => {
                        const t1 = teams.find(t => t.id === matchup.team1.teamId);
                        const t2 = teams.find(t => t.id === matchup.team2.teamId);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 mb-2 last:mb-0">
                            <span className="text-sm font-medium">{t1?.flag} {t1?.name}</span>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">vs</span>
                            <span className="text-sm font-medium">{t2?.name} {t2?.flag}</span>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="success" fullWidth onClick={() => confirmBracket(category)}>
                          Confirmar e Criar Jogos
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setGeneratedBrackets(p => { const n = {...p}; delete n[category]; return n; })}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {existingElimination.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confrontos</p>
                    {existingElimination.map(match => {
                      const t1 = teams.find(t => t.id === match.team1Id);
                      const t2 = teams.find(t => t.id === match.team2Id);
                      return (
                        <div key={match.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">{t1?.flag} {t1?.name}</span>
                          {match.result ? (
                            <span className="text-sm font-bold bg-gray-900 text-white px-3 py-1 rounded-lg">
                              {match.result.team1Score} × {match.result.team2Score}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">vs</span>
                          )}
                          <span className="text-sm font-medium text-gray-800">{t2?.name} {t2?.flag}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
