import { useState } from 'react';
import { MapPin, Plus, Activity } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { MATCH_STATUS } from '../../data/mockData';
import { Card, CardBody } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { WarmupTimer } from '../common/Timer';

export function AdmCourts() {
  const { courts, matches, teams, addCourtToList, updateCourtActive, addNotification } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });

  const getCourtCurrentGame = (courtId) => {
    for (const match of matches) {
      for (const game of match.games) {
        if (game.courtId === courtId && [MATCH_STATUS.WARMING_UP, MATCH_STATUS.IN_PROGRESS, MATCH_STATUS.LINEUP_SENT].includes(game.status)) {
          return { game, match };
        }
      }
    }
    return null;
  };

  const handleAdd = () => {
    if (!form.name) return;
    const id = `court${Date.now()}`;
    addCourtToList({ ...form, id, active: true });
    addNotification('Quadra adicionada!', 'success');
    setForm({ name: '', location: '' });
    setShowModal(false);
  };

  const toggleActive = (courtId) => {
    const court = courts.find(c => c.id === courtId);
    if (court) updateCourtActive(courtId, !court.active);
  };

  const typeLabels = { male: '♂ Masculino', female: '♀ Feminino', mixed: '⚥ Misto' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Quadras</h2>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus size={16} className="mr-1" /> Nova Quadra
        </Button>
      </div>

      {/* Court Overview */}
      <div className="grid gap-3 sm:grid-cols-2">
        {courts.map(court => {
          const current = getCourtCurrentGame(court.id);
          const isActive = court.active;

          return (
            <Card key={court.id} className={!isActive ? 'opacity-60' : ''}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{court.name}</h3>
                    {court.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {court.location}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(court.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {isActive ? 'Ativa' : 'Inativa'}
                  </button>
                </div>

                {current ? (
                  <div className="space-y-2">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-600">{typeLabels[current.game.type]}</span>
                        <StatusBadge status={current.game.status} />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {teams.find(t => t.id === current.match.team1Id)?.flag} {teams.find(t => t.id === current.match.team1Id)?.name}
                        {' vs '}
                        {teams.find(t => t.id === current.match.team2Id)?.name} {teams.find(t => t.id === current.match.team2Id)?.flag}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">CAT {current.match.category}</p>
                    </div>
                    {current.game.status === MATCH_STATUS.WARMING_UP && (
                      <WarmupTimer startedAt={current.game.warmupStartedAt} />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-400">{isActive ? 'Quadra disponível' : 'Quadra desativada'}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* General Overview Table */}
      <Card>
        <CardBody>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" /> Visão Geral das Quadras
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-2">Quadra</th>
                  <th className="text-left py-2">Confronto Atual</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {courts.map(court => {
                  const current = getCourtCurrentGame(court.id);
                  const t1 = current ? teams.find(t => t.id === current.match.team1Id) : null;
                  const t2 = current ? teams.find(t => t.id === current.match.team2Id) : null;
                  return (
                    <tr key={court.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-800">{court.name}</td>
                      <td className="py-2.5 text-gray-600">
                        {current ? `${t1?.flag} ${t1?.name} vs ${t2?.name} ${t2?.flag}` : '—'}
                      </td>
                      <td className="py-2.5">
                        {current ? <StatusBadge status={current.game.status} /> : (
                          <span className={`text-xs font-medium ${court.active ? 'text-green-600' : 'text-gray-400'}`}>
                            {court.active ? 'Livre' : 'Inativa'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Quadra">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Quadra</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Quadra 7" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Arena Principal" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
          </div>
          <Button fullWidth onClick={handleAdd}>Adicionar Quadra</Button>
        </div>
      </Modal>
    </div>
  );
}
