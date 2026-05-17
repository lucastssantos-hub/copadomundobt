import { useState } from 'react';
import { Plus, Users, ChevronRight, Share2, Copy, Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { CategoryBadge } from '../common/Badge';
import { generateCaptainCode } from '../../contexts/AuthContext';

export function AdmTeams() {
  const { teams, athletes, captains, addTeam, addAthlete, getAthletesByTeam } = useApp();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const [teamForm, setTeamForm] = useState({ name: '', flag: '', category: 'A', color: '#3B82F6' });
  const [athleteForm, setAthleteForm] = useState({ name: '', gender: 'M', number: '' });
  const [copied, setCopied] = useState(false);

  const filteredTeams = filterCategory === 'all' ? teams : teams.filter(t => t.category === filterCategory);

  const handleAddTeam = () => {
    if (!teamForm.name) return;
    addTeam(teamForm);
    setTeamForm({ name: '', flag: '', category: 'A', color: '#3B82F6' });
    setShowTeamModal(false);
  };

  const handleAddAthlete = () => {
    if (!athleteForm.name || !selectedTeam) return;
    addAthlete({ ...athleteForm, teamId: selectedTeam.id, number: parseInt(athleteForm.number) || 0 });
    setAthleteForm({ name: '', gender: 'M', number: '' });
    setShowAthleteModal(false);
  };

  const captain = selectedTeam ? captains.find(c => c.teamId === selectedTeam.id) : null;
  const teamAthletes = selectedTeam ? getAthletesByTeam(selectedTeam.id) : [];
  const captainCode = selectedTeam ? generateCaptainCode(selectedTeam.name, selectedTeam.category) : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(captainCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `🎾 *Copa do Mundo de Beach Tennis 2026*\n\nOlá! Seu código de acesso ao painel do capitão é:\n\n*${captainCode}*\n\nAcesse: https://lucastssantos-hub.github.io/copadomundobt/`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Equipes</h2>
        <Button onClick={() => setShowTeamModal(true)} size="sm">
          <Plus size={16} className="mr-1" /> Nova Equipe
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? 'Todas' : `Cat ${cat}`}
          </button>
        ))}
      </div>

      {/* Teams List */}
      {filteredTeams.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhuma equipe cadastrada.</p></CardBody></Card>
      ) : (
        <div className="grid gap-2">
          {filteredTeams.map(team => {
            const teamCaptain = captains.find(c => c.teamId === team.id);
            const athleteCount = athletes.filter(a => a.teamId === team.id).length;
            return (
              <Card key={team.id} onClick={() => setSelectedTeam(team)} className="active:bg-gray-50">
                <CardBody className="p-3 flex items-center gap-3">
                  <div className="text-3xl">{team.flag || '🏳️'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">{team.name}</p>
                      <CategoryBadge category={team.category} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {athleteCount} atleta(s) • Cap: {teamCaptain?.name || 'Não definido'}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Team Detail Modal */}
      <Modal isOpen={!!selectedTeam} onClose={() => setSelectedTeam(null)} title={selectedTeam ? `${selectedTeam.flag} ${selectedTeam.name}` : ''} size="lg">
        {selectedTeam && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CategoryBadge category={selectedTeam.category} />
                {captain && <p className="text-sm text-gray-600 mt-1">Capitão: <strong>{captain.name}</strong> ({captain.username})</p>}
              </div>
            </div>

            {/* Captain Access Code */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                <Share2 size={12} /> Código de Acesso do Capitão
              </p>
              <p className="font-mono font-bold text-xl tracking-widest text-blue-900 mb-2">{captainCode}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 rounded-lg text-xs font-medium text-white hover:bg-green-600 transition-colors"
                >
                  <Share2 size={13} /> Enviar WhatsApp
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Users size={16} /> Atletas ({teamAthletes.length})
                </h4>
                <Button size="sm" onClick={() => setShowAthleteModal(true)}>
                  <Plus size={14} className="mr-1" /> Atleta
                </Button>
              </div>
              {teamAthletes.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum atleta cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {['M', 'F'].map(gender => {
                    const filtered = teamAthletes.filter(a => a.gender === gender);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={gender}>
                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                          {gender === 'M' ? 'Masculino' : 'Feminino'}
                        </p>
                        <div className="space-y-1">
                          {filtered.map(athlete => (
                            <div key={athlete.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                                {athlete.number || '#'}
                              </span>
                              <span className="text-sm text-gray-800 flex-1">{athlete.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Team Modal */}
      <Modal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} title="Nova Equipe">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País / Nome da Equipe</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Brasil" value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bandeira (Emoji)</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: 🇧🇷" value={teamForm.flag} onChange={e => setTeamForm(p => ({ ...p, flag: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={teamForm.category} onChange={e => setTeamForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>Categoria {c}</option>)}
            </select>
          </div>
          <Button fullWidth onClick={handleAddTeam}>Cadastrar Equipe</Button>
        </div>
      </Modal>

      {/* Add Athlete Modal */}
      <Modal isOpen={showAthleteModal} onClose={() => setShowAthleteModal(false)} title={`Novo Atleta — ${selectedTeam?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Atleta</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Nome completo" value={athleteForm.name} onChange={e => setAthleteForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <div className="flex gap-2">
              {['M', 'F'].map(g => (
                <button key={g} onClick={() => setAthleteForm(p => ({ ...p, gender: g }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${athleteForm.gender === g ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  {g === 'M' ? 'Masculino' : 'Feminino'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: 1" value={athleteForm.number} onChange={e => setAthleteForm(p => ({ ...p, number: e.target.value }))} />
          </div>
          <Button fullWidth onClick={handleAddAthlete}>Cadastrar Atleta</Button>
        </div>
      </Modal>
    </div>
  );
}
