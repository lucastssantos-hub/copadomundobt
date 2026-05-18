import { useState } from 'react';
import { MapPin, Minus, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardBody } from '../common/Card';

const WARMUP_MS = 6 * 60 * 1000;

function fmtTimer(ms) {
  if (ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AdmCourts() {
  const { state, setNumQuadras, liberarQuadra } = useApp();
  const numQuadras = state.numQuadras || 4;
  const eqs = state.eqs || [];
  const jogos = state.jogos || [];
  const [now] = useState(() => Date.now());

  const jogoNaQuadra = (q) => jogos.find(j => j.quadra === q && !j.res);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Quadras</h2>
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
          <button onClick={() => setNumQuadras(Math.max(1, numQuadras - 1))}
            className="w-7 h-7 rounded-lg bg-white shadow text-gray-700 flex items-center justify-center hover:bg-gray-50">
            <Minus size={14} />
          </button>
          <span className="text-base font-bold text-gray-800 w-6 text-center">{numQuadras}</span>
          <button onClick={() => setNumQuadras(numQuadras + 1)}
            className="w-7 h-7 rounded-lg bg-white shadow text-gray-700 flex items-center justify-center hover:bg-gray-50">
            <Plus size={14} />
          </button>
          <span className="text-xs text-gray-500 ml-1">quadras</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: numQuadras }, (_, i) => i + 1).map(q => {
          const jogo = jogoNaQuadra(q);
          const eq1 = jogo ? eqs.find(e => e.id === jogo.e1) : null;
          const eq2 = jogo ? eqs.find(e => e.id === jogo.e2) : null;
          const elapsed = jogo?.timerInicio ? Date.now() - jogo.timerInicio : 0;
          const remaining = Math.max(0, WARMUP_MS - elapsed);
          const isWarmup = jogo?.timerInicio && remaining > 0;
          const isPlaying = jogo?.timerInicio && remaining <= 0;

          return (
            <Card key={q} className={jogo ? 'border-l-4 border-l-blue-500' : ''}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-xl">
                      <MapPin size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Quadra {q}</h3>
                      {jogo && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          isPlaying ? 'bg-green-100 text-green-700' :
                          isWarmup ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {isPlaying ? 'Em Jogo' : isWarmup ? 'Aquecendo' : 'Escalando'}
                        </span>
                      )}
                    </div>
                  </div>
                  {!jogo && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Livre</span>
                  )}
                </div>

                {jogo ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {eq1?.bandeira} {eq1?.nome} <span className="text-gray-400 font-normal">vs</span> {eq2?.nome} {eq2?.bandeira}
                    </p>
                    <p className="text-xs text-gray-500">Cat {jogo.catId} · {jogo.gnome}</p>
                    {isWarmup && (
                      <div className="bg-yellow-50 rounded-xl p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-yellow-700">Tempo de aquecimento</span>
                          <span className="text-base font-bold font-mono text-yellow-800">{fmtTimer(remaining)}</span>
                        </div>
                        <div className="w-full bg-yellow-200 rounded-full h-1.5">
                          <div className="bg-yellow-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(remaining / WARMUP_MS) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <button onClick={() => liberarQuadra(jogo.id)}
                      className="w-full py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      Liberar Quadra
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-400">Disponível</p>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Summary table */}
      <Card>
        <CardBody>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" /> Resumo das Quadras
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-2">Quadra</th>
                  <th className="text-left py-2">Confronto</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numQuadras }, (_, i) => i + 1).map(q => {
                  const jogo = jogoNaQuadra(q);
                  const eq1 = jogo ? eqs.find(e => e.id === jogo.e1) : null;
                  const eq2 = jogo ? eqs.find(e => e.id === jogo.e2) : null;
                  const elapsed = jogo?.timerInicio ? Date.now() - jogo.timerInicio : 0;
                  const remaining = Math.max(0, WARMUP_MS - elapsed);
                  return (
                    <tr key={q} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-800">Quadra {q}</td>
                      <td className="py-2.5 text-gray-600">
                        {jogo ? `${eq1?.bandeira || ''} ${eq1?.nome} vs ${eq2?.nome} ${eq2?.bandeira || ''}` : '—'}
                      </td>
                      <td className="py-2.5">
                        {!jogo ? (
                          <span className="text-xs text-green-600 font-medium">Livre</span>
                        ) : jogo.timerInicio && remaining > 0 ? (
                          <span className="text-xs text-yellow-600 font-medium">Aquecendo {fmtTimer(remaining)}</span>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">Em Jogo</span>
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
    </div>
  );
}
