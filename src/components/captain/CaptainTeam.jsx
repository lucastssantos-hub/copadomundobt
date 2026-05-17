import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { generateCaptainCode } from '../../contexts/AuthContext';
import { Users, Star, Copy, Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { CategoryBadge } from '../common/Badge';

export function CaptainTeam() {
  const { user } = useAuth();
  const { teams, athletes, captains, groups, getAthletesByTeam } = useApp();
  const [copied, setCopied] = useState(false);

  const myTeam = teams.find(t => t.id === user.teamId);
  const myAthletes = getAthletesByTeam(user.teamId);
  const myCaptain = captains.find(c => c.id === user.captainId);
  const myGroup = groups.find(g => g.teamIds.includes(user.teamId));

  const maleAthletes = myAthletes.filter(a => a.gender === 'M');
  const femaleAthletes = myAthletes.filter(a => a.gender === 'F');
  const captainCode = myTeam ? generateCaptainCode(myTeam.name, myTeam.category) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(captainCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <span className="text-6xl">{myTeam?.flag || '🏳️'}</span>
          <div>
            <h1 className="text-2xl font-bold">{myTeam?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <CategoryBadge category={myTeam?.category} />
              {myGroup && <span className="text-blue-200 text-sm">{myGroup.name}</span>}
            </div>
            <p className="text-blue-200 text-sm mt-1">
              <Star size={12} className="inline mr-1" />
              Capitão: {myCaptain?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Login Info */}
      <Card>
        <CardBody>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seu Código de Acesso</p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono font-bold text-xl tracking-widest text-blue-800">{captainCode}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Use este código para entrar no painel</p>
        </CardBody>
      </Card>

      {/* Athletes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-900">Atletas ({myAthletes.length})</h3>
          </div>
        </CardHeader>
        <CardBody>
          {[
            { label: 'Masculino', data: maleAthletes },
            { label: 'Feminino', data: femaleAthletes },
          ].map(({ label, data }) => (
            <div key={label} className="mb-4 last:mb-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
              {data.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhum atleta cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {data.map(athlete => (
                    <div key={athlete.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">
                        {athlete.number || '#'}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{athlete.name}</p>
                        {myCaptain?.athleteId === athlete.id && (
                          <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                            <Star size={10} /> Capitão
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
