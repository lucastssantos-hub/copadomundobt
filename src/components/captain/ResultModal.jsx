import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function ResultModal({ isOpen, onClose, match, game, isTeam1, onSubmitted }) {
  const { submitResult, teams } = useApp();
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');

  if (!match || !game) return null;

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const myTeam = isTeam1 ? team1 : team2;
  const oppTeam = isTeam1 ? team2 : team1;

  const handleSubmit = () => {
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return;
    const finalScore1 = isTeam1 ? s1 : s2;
    const finalScore2 = isTeam1 ? s2 : s1;
    submitResult(match.id, game.id, finalScore1, finalScore2);
    onSubmitted?.(match, game, s1, s2);
    setScore1('');
    setScore2('');
    onClose();
  };

  const typeLabels = { male: 'Masculino', female: 'Feminino', mixed: 'Misto' };

  return (
    <Modal isOpen={isOpen} onClose={() => { setScore1(''); setScore2(''); onClose(); }} title={`Resultado — ${typeLabels[game?.type]}`}>
      <div className="space-y-6">
        <p className="text-sm text-gray-600 text-center">
          Informe o placar final do jogo. O resultado será validado pelo ADM.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-1">{myTeam?.flag}</div>
            <p className="text-sm font-bold text-gray-800 mb-3">{myTeam?.name}</p>
            <input
              type="number"
              min="0"
              max="99"
              value={score1}
              onChange={e => setScore1(e.target.value)}
              className="w-full text-center text-4xl font-bold border-2 border-gray-200 rounded-2xl py-4 focus:border-blue-500 outline-none"
              placeholder="0"
            />
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{oppTeam?.flag}</div>
            <p className="text-sm font-bold text-gray-800 mb-3">{oppTeam?.name}</p>
            <input
              type="number"
              min="0"
              max="99"
              value={score2}
              onChange={e => setScore2(e.target.value)}
              className="w-full text-center text-4xl font-bold border-2 border-gray-200 rounded-2xl py-4 focus:border-blue-500 outline-none"
              placeholder="0"
            />
          </div>
        </div>

        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={score1 === '' || score2 === ''}
          variant="success"
          size="lg"
        >
          Enviar Resultado para Validação
        </Button>
      </div>
    </Modal>
  );
}
