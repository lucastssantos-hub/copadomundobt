import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES, MATCH_STATUS } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { StatusBadge, CategoryBadge } from '../common/Badge';
import { WarmupTimer } from '../common/Timer';
import { MatchScoreHistory } from '../common/MatchScoreHistory';

export function AdmMatches() {
  const { matches, groups, teams, courts, addMatch, releaseCourt, startGame, validateResult, assignCourt, editResult, addMixedGame, addAlert } = useApp();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditResult, setShowEditResult] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editScores, setEditScores] = useState({ score1: '', score2: '' });

  const [form, setForm] = useState({ groupId: '', team1Id: '', team2Id: '', courtId: '', scheduledTime: '' });

  const filteredMatches = matches.filter(m => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  const selectedGroup = groups.find(g => g.id === form.groupId);
  const groupTeams = selectedGroup ? teams.filter(t => selectedGroup.teamIds.includes(t.id)) : [];

  const handleCreate = () => {
    if (!form.groupId || !form.team1Id || !form.team2Id || form.team1Id === form.team2Id) return;
    const group = groups.find(g => g.id === form.groupId);
    addMatch({ ...form, category: group?.category });
    setForm({ groupId: '', team1Id: '', team2Id: '', courtId: '', scheduledTime: '' });
    setShowCreateModal(false);
  };

  const handleValidateResult = (matchId, gameId, approved, match, game) => {
    validateResult(matchId, gameId, approved);
    setSelectedMatch(prev => {
      if (!prev || prev.id !== matchId) return prev;
      return matches.find(m => m.id === matchId) || null;
    });
    if (match && game) {
      const typeLabels2 = { male: 'Masculino', female: 'Feminino', mixed: 'Misto' };
      const t1 = teams.find(t => t.id === match.team1Id);
      const t2 = teams.find(t => t.id === match.team2Id);
      const msg = approved
        ? `✅ Resultado ${typeLabels2[game.type]} validado: ${t1?.name} ${game.pendingScore1}×${game.pendingScore2} ${t2?.name}`
        : `❌ Resultado ${typeLabels2[game.type]} rejeitado — ${t1?.name} vs ${t2?.name}`;
      addAlert(msg, 'validation', match.team1Id);
      addAlert(msg, 'validation', match.team2Id);
    }
  };

  const handleReleaseCourt = (matchId, gameId, match, game) => {
    releaseCourt(matchId, gameId);
    if (match && game) {
      const court = courts.find(c => c.id === game.courtId);
      const typeLabels2 = { male: 'Masculino', female: 'Feminino', mixed: 'Misto' };
      const msg = `📍 Quadra ${court?.name || ''} liberada — Aquecimento iniciado (${typeLabels2[game.type]})`;
      addAlert(msg, 'court', match.team1Id);
      addAlert(msg, 'court', match.team2Id);
    }
  };

  const handleEditResult = (matchId, gameId) => {
    editResult(matchId, gameId, parseInt(editScores.score1), parseInt(editScores.score2));
    setShowEditResult(null);
    setEditScores({ score1: '', score2: '' });
  };

  const checkShouldAddMixed = (match) => {
    const male = match.games.find(g => g.type === 'male');
    const female = match.games.find(g => g.type === 'female');
    const maleWon = male?.score1 > male?.score2;
    const femaleWon = female?.score1 > female?.score2;
    const maleFinished = male?.status === MATCH_STATUS.FINISHED;
    const femaleFinished = female?.status === MATCH_STATUS.FINISHED;
    if (maleFinished && femaleFinished && maleWon !== femaleWon) {
      const hasMixed = match.games.some(g => g.type === 'mixed');
      if (!hasMixed) addMixedGame(match.id);
    }
  };

  const typeLabels = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Confrontos</h2>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus size={16} className="mr-1" /> Novo
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {cat === 'all' ? 'Todas' : `Cat ${cat}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { val: 'all', label: 'Todos' },
            { val: MATCH_STATUS.WAITING_LINEUP, label: 'Ag. Escalação' },
            { val: MATCH_STATUS.LINEUP_SENT, label: 'Escalado' },
            { val: MATCH_STATUS.WARMING_UP, label: 'Aquecendo' },
            { val: MATCH_STATUS.IN_PROGRESS, label: 'Em Jogo' },
            { val: MATCH_STATUS.WAITING_RESULT, label: 'Ag. Resultado' },
            { val: MATCH_STATUS.FINISHED, label: 'Finalizado' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === val ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhum confronto encontrado.</p></CardBody></Card>
      ) : (
        <div className="space-y-2">
          {filteredMatches.map(match => {
            const team1 = teams.find(t => t.id === match.team1Id);
            const team2 = teams.find(t => t.id === match.team2Id);
            const court = courts.find(c => c.id === match.courtId);
            const isSelected = selectedMatch?.id === match.id;

            return (
              <Card key={match.id}>
                <CardBody className="p-3" onClick={() => {
                  setSelectedMatch(isSelected ? null : match);
                  checkShouldAddMixed(match);
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{team1?.flag} {team1?.name}</span>
                        {match.result && (
                          <span className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded">
                            {match.result.team1Score} × {match.result.team2Score}
                          </span>
                        )}
                        <span className="font-bold text-gray-900 text-sm">{team2?.name} {team2?.flag}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <CategoryBadge category={match.category} />
                        <StatusBadge status={match.status} />
                        {court && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={10} /> {court.name}
                          </span>
                        )}
                        {match.scheduledTime && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={10} /> {match.scheduledTime}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </CardBody>

                {isSelected && (
                  <div className="border-t border-gray-100 px-3 pb-3 space-y-3">
                    {match.status === MATCH_STATUS.FINISHED && (
                      <MatchScoreHistory match={match} team1={team1} team2={team2} />
                    )}
                    {match.games.map(game => (
                      <GameCard
                        key={game.id}
                        game={game}
                        match={match}
                        team1={team1}
                        team2={team2}
                        courts={courts}
                        typeLabels={typeLabels}
                        onRelease={() => handleReleaseCourt(match.id, game.id, match, game)}
                        onStart={() => startGame(match.id, game.id)}
                        onValidate={(approved) => handleValidateResult(match.id, game.id, approved, match, game)}
                        onEditResult={() => {
                          setShowEditResult({ matchId: match.id, gameId: game.id, game });
                          setEditScores({ score1: game.score1 || '', score2: game.score2 || '' });
                        }}
                        onAssignCourt={(courtId) => assignCourt(match.id, game.id, courtId)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Match Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Novo Confronto" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.groupId} onChange={e => setForm(p => ({ ...p, groupId: e.target.value, team1Id: '', team2Id: '' }))}>
              <option value="">Selecione um grupo</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} (Cat {g.category})</option>)}
            </select>
          </div>
          {form.groupId && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipe 1</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.team1Id} onChange={e => setForm(p => ({ ...p, team1Id: e.target.value }))}>
                    <option value="">Selecione</option>
                    {groupTeams.filter(t => t.id !== form.team2Id).map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipe 2</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.team2Id} onChange={e => setForm(p => ({ ...p, team2Id: e.target.value }))}>
                    <option value="">Selecione</option>
                    {groupTeams.filter(t => t.id !== form.team1Id).map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quadra</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.courtId} onChange={e => setForm(p => ({ ...p, courtId: e.target.value }))}>
                    <option value="">Não definida</option>
                    {courts.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <input type="time" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.scheduledTime} onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))} />
                </div>
              </div>
            </>
          )}
          <Button fullWidth onClick={handleCreate} disabled={!form.team1Id || !form.team2Id}>Criar Confronto</Button>
        </div>
      </Modal>

      {/* Edit Result Modal */}
      <Modal isOpen={!!showEditResult} onClose={() => setShowEditResult(null)} title="Editar Resultado">
        {showEditResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Corrigir placar do jogo {typeLabels[showEditResult.game.type]}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placar Equipe 1</label>
                <input type="number" min="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-lg text-center font-bold" value={editScores.score1} onChange={e => setEditScores(p => ({ ...p, score1: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placar Equipe 2</label>
                <input type="number" min="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-lg text-center font-bold" value={editScores.score2} onChange={e => setEditScores(p => ({ ...p, score2: e.target.value }))} />
              </div>
            </div>
            <Button fullWidth onClick={() => handleEditResult(showEditResult.matchId, showEditResult.gameId)} variant="warning">
              Corrigir Resultado
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GameCard({ game, match, team1, team2, courts, typeLabels, onRelease, onStart, onValidate, onEditResult, onAssignCourt }) {
  const court = courts.find(c => c.id === game.courtId);
  const athletes1 = game.lineup1 || [];
  const athletes2 = game.lineup2 || [];

  return (
    <div className="bg-gray-50 rounded-xl p-3 mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">{typeLabels[game.type]}</span>
        <StatusBadge status={game.status} />
      </div>

      {/* Lineup Preview */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="font-semibold text-gray-600 mb-1">{team1?.flag} {team1?.name}</p>
          {athletes1.length > 0 ? athletes1.map((id, i) => (
            <p key={id} className="text-gray-500">Par {i + 1}: #{id.slice(-4)}</p>
          )) : <p className="text-gray-400 italic">Sem escalação</p>}
        </div>
        <div>
          <p className="font-semibold text-gray-600 mb-1">{team2?.flag} {team2?.name}</p>
          {athletes2.length > 0 ? athletes2.map((id, i) => (
            <p key={id} className="text-gray-500">Par {i + 1}: #{id.slice(-4)}</p>
          )) : <p className="text-gray-400 italic">Sem escalação</p>}
        </div>
      </div>

      {/* Score */}
      {(game.score1 !== null || game.pendingScore1 !== null) && (
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="text-2xl font-bold text-gray-900">{game.score1 ?? game.pendingScore1}</span>
          <span className="text-gray-400">×</span>
          <span className="text-2xl font-bold text-gray-900">{game.score2 ?? game.pendingScore2}</span>
          {game.pendingScore1 !== null && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pendente</span>}
        </div>
      )}

      {/* Warmup Timer */}
      {game.status === MATCH_STATUS.WARMING_UP && (
        <WarmupTimer startedAt={game.warmupStartedAt} onFinish={() => {}} />
      )}

      {/* Court assignment */}
      {!game.courtId && game.status !== MATCH_STATUS.FINISHED && (
        <select
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
          onChange={e => onAssignCourt(e.target.value)}
          defaultValue=""
        >
          <option value="">Definir quadra...</option>
          {courts.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {court && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {court.name}</p>}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {game.status === MATCH_STATUS.LINEUP_SENT && (
          <Button size="sm" variant="success" onClick={onRelease}>
            Liberar Quadra
          </Button>
        )}
        {game.status === MATCH_STATUS.WARMING_UP && (
          <Button size="sm" variant="primary" onClick={onStart}>
            Iniciar Jogo
          </Button>
        )}
        {game.status === MATCH_STATUS.WAITING_RESULT && (
          <>
            <Button size="sm" variant="success" onClick={() => onValidate(true)}>✓ Validar</Button>
            <Button size="sm" variant="danger" onClick={() => onValidate(false)}>✗ Rejeitar</Button>
          </>
        )}
        {game.status === MATCH_STATUS.FINISHED && (
          <Button size="sm" variant="ghost" onClick={onEditResult}>
            Editar Resultado
          </Button>
        )}
      </div>
    </div>
  );
}
