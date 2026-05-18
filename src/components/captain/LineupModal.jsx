import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function LineupModal({ isOpen, onClose, match, game, isTeam1, onSubmitted }) {
  const { getAthletesByTeam, submitLineup } = useApp();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);

  if (!match || !game) return null;

  const teamId = isTeam1 ? match.team1Id : match.team2Id;
  const athletes = getAthletesByTeam(teamId);

  const genderFilter = game.type === 'male' ? 'M' : game.type === 'female' ? 'F' : null;
  const availableAthletes = genderFilter ? athletes.filter(a => a.gender === genderFilter) : athletes;

  const toggleAthlete = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const handleSubmit = () => {
    if (selected.length !== 2) return;
    submitLineup(match.id, game.id, isTeam1 ? 1 : 2, selected);
    onSubmitted?.(match, game);
    setSelected([]);
    onClose();
  };

  const typeLabels = { male: 'Masculina', female: 'Feminina', mixed: 'Mista' };
  const typeIcons = { male: '♂', female: '♀', mixed: '⚥' };
  const genderLabels = { M: 'Masculino', F: 'Feminino' };

  const groupedAthletes = game.type === 'mixed'
    ? {
        Masculino: availableAthletes.filter(a => a.gender === 'M'),
        Feminino: availableAthletes.filter(a => a.gender === 'F'),
      }
    : { [genderLabels[genderFilter] || 'Atletas']: availableAthletes };

  return (
    <Modal isOpen={isOpen} onClose={() => { setSelected([]); onClose(); }} title="Escalação" size="lg">
      <div className="space-y-4">
        {/* Category + game type highlight */}
        <div className="bg-blue-600 rounded-xl px-4 py-3 text-white text-center">
          <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-0.5">
            {typeIcons[game?.type]} Dupla {typeLabels[game?.type]}
          </p>
          <p className="text-2xl font-bold tracking-wider">CAT {match?.category}</p>
        </div>
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          Selecione <strong>2 atletas</strong> para a dupla {typeLabels[game?.type]}.
          {game?.type === 'mixed' && ' Selecione 1 masculino e 1 feminino.'}
        </p>

        {Object.entries(groupedAthletes).map(([label, list]) => (
          <div key={label}>
            {game?.type === 'mixed' && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>}
            <div className="space-y-2">
              {list.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Nenhum atleta disponível</p>
              ) : list.map(athlete => {
                const isSelected = selected.includes(athlete.id);
                const isMixedM = game?.type === 'mixed' && athlete.gender === 'M';
                const isMixedF = game?.type === 'mixed' && athlete.gender === 'F';
                const alreadyHasM = game?.type === 'mixed' && selected.some(id => {
                  const a = list.find(x => x.id === id);
                  return a && a.gender === 'M';
                });
                const alreadyHasF = game?.type === 'mixed' && selected.some(id => {
                  const a = list.find(x => x.id === id);
                  return a && a.gender === 'F';
                });
                const isDisabled = !isSelected && selected.length === 2 ||
                  (!isSelected && game?.type === 'mixed' && isMixedM && alreadyHasM) ||
                  (!isSelected && game?.type === 'mixed' && isMixedF && alreadyHasF);

                return (
                  <button
                    key={athlete.id}
                    onClick={() => !isDisabled && toggleAthlete(athlete.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' :
                      isDisabled ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed' :
                      'border-gray-200 hover:border-blue-300 active:bg-gray-50'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isSelected ? selected.indexOf(athlete.id) + 1 : athlete.number || '#'}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{athlete.name}</p>
                      <p className="text-xs text-gray-500">{athlete.gender === 'M' ? 'Masculino' : 'Feminino'}</p>
                    </div>
                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {selected.length === 2 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-green-800 mb-1">Dupla selecionada:</p>
            <p className="text-sm text-green-700">{availableAthletes.find(a => a.id === selected[0])?.name}</p>
            <p className="text-sm text-green-700">{availableAthletes.find(a => a.id === selected[1])?.name}</p>
          </div>
        )}

        <Button fullWidth onClick={handleSubmit} disabled={selected.length !== 2} variant="success" size="lg">
          Enviar Escalação
        </Button>
      </div>
    </Modal>
  );
}
