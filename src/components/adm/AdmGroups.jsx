import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { CategoryBadge } from '../common/Badge';

export function AdmGroups() {
  const { groups, teams, standings, addGroup } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'A', teamIds: [] });
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredGroups = filterCategory === 'all' ? groups : groups.filter(g => g.category === filterCategory);
  const categoryTeams = teams.filter(t => t.category === form.category);

  const toggleTeam = (teamId) => {
    setForm(prev => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  const handleCreate = () => {
    if (!form.name || form.teamIds.length < 2) return;
    addGroup(form);
    setForm({ name: '', category: 'A', teamIds: [] });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Grupos</h2>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus size={16} className="mr-1" /> Novo Grupo
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat === 'all' ? 'Todos' : `Cat ${cat}`}
          </button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhum grupo criado.</p></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const groupStandings = standings[group.id] || [];
            return (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{group.name}</h3>
                    <CategoryBadge category={group.category} />
                    <span className="text-xs text-gray-500 ml-auto">{group.teamIds.length} equipes</span>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {/* Standings Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                          <th className="text-left px-4 py-2">Equipe</th>
                          <th className="px-2 py-2 text-center">J</th>
                          <th className="px-2 py-2 text-center">V</th>
                          <th className="px-2 py-2 text-center">D</th>
                          <th className="px-2 py-2 text-center">JG</th>
                          <th className="px-2 py-2 text-center font-bold text-gray-700">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings.map((standing, idx) => {
                          const team = teams.find(t => t.id === standing.teamId);
                          return (
                            <tr key={standing.teamId} className={`border-b border-gray-50 last:border-0 ${idx === 0 ? 'bg-green-50/50' : ''}`}>
                              <td className="px-4 py-2.5 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                                <span>{team?.flag}</span>
                                <span className="font-medium text-gray-800 truncate">{team?.name}</span>
                              </td>
                              <td className="px-2 py-2.5 text-center text-gray-600">{standing.played}</td>
                              <td className="px-2 py-2.5 text-center text-green-600 font-medium">{standing.wins}</td>
                              <td className="px-2 py-2.5 text-center text-red-500">{standing.losses}</td>
                              <td className="px-2 py-2.5 text-center text-gray-600">{standing.gamesWon}/{standing.gamesLost}</td>
                              <td className="px-2 py-2.5 text-center font-bold text-gray-900">{standing.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Grupo">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Grupo</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Grupo A1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, teamIds: [] }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>Categoria {c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Equipes <span className="text-gray-400">({form.teamIds.length} selecionadas)</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categoryTeams.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma equipe nesta categoria</p>
              ) : categoryTeams.map(team => (
                <button key={team.id} onClick={() => toggleTeam(team.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-colors ${form.teamIds.includes(team.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span>{team.flag || '🏳️'}</span>
                  <span className="font-medium">{team.name}</span>
                  {form.teamIds.includes(team.id) && <span className="ml-auto text-blue-600 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth onClick={handleCreate} disabled={form.teamIds.length < 2}>
            Criar Grupo ({form.teamIds.length} equipes)
          </Button>
        </div>
      </Modal>
    </div>
  );
}
