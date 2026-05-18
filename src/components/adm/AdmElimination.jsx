import { useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardBody } from '../common/Card';
import { Button } from '../common/Button';

function calcGroupStandings(eqs, jogos) {
  const map = {};
  for (const eq of eqs) {
    map[eq.id] = { eqId: eq.id, nome: eq.nome, bandeira: eq.bandeira, j: 0, v: 0, d: 0, gv: 0, gd: 0, pts: 0 };
  }
  for (const jogo of jogos) {
    if (!jogo.res || !jogo.venc) continue;
    const r1 = map[jogo.e1];
    const r2 = map[jogo.e2];
    if (!r1 || !r2) continue;
    r1.j++; r2.j++;
    const det = jogo.det || {};
    for (const k of ['fd', 'md', 'mx']) {
      const s = det[k];
      if (!s) continue;
      r1.gv += s.s1 || 0; r1.gd += s.s2 || 0;
      r2.gv += s.s2 || 0; r2.gd += s.s1 || 0;
    }
    if (jogo.venc === jogo.e1) { r1.v++; r1.pts += 3; r2.d++; }
    else { r2.v++; r2.pts += 3; r1.d++; }
  }
  return map;
}

export function AdmElimination() {
  const { state, addNotification } = useApp();
  const eqs = state.eqs || [];
  const jogos = state.jogos || [];
  const cats = state.cats || [];
  const [generatedBrackets, setGeneratedBrackets] = useState({});

  const activeCats = cats.filter(c => c.ativa);
  if (activeCats.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">Eliminatórias</h2>
        </div>
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhuma categoria ativa.</p></CardBody></Card>
      </div>
    );
  }

  const generateBracket = (catId) => {
    const catEqs = eqs.filter(e => e.catId === catId);
    const catJogos = jogos.filter(j => j.catId === catId);
    const pendingJogos = catJogos.filter(j => !j.res);

    if (pendingJogos.length > 0) {
      addNotification(`Ainda há ${pendingJogos.length} jogo(s) sem resultado na Cat ${catId}`, 'warning');
    }

    const standings = calcGroupStandings(catEqs, catJogos);
    const grupoNums = [...new Set(catEqs.map(e => e.grupo))].sort((a, b) => a - b);

    const qualifiedEqs = [];
    for (const g of grupoNums) {
      const grpEqs = catEqs.filter(e => e.grupo === g);
      const sorted = grpEqs.map(eq => standings[eq.id] || { eqId: eq.id, pts: 0, v: 0, gv: 0, gd: 0 })
        .sort((a, b) => b.pts - a.pts || b.v - a.v || (b.gv - b.gd) - (a.gv - a.gd));
      qualifiedEqs.push(...sorted.slice(0, 2));
    }

    if (qualifiedEqs.length < 2) {
      addNotification('Equipes insuficientes para gerar chave.', 'error');
      return;
    }

    const bracket = [];
    for (let i = 0; i < qualifiedEqs.length - 1; i += 2) {
      const eq1 = eqs.find(e => e.id === qualifiedEqs[i].eqId);
      const eq2 = eqs.find(e => e.id === qualifiedEqs[i + 1]?.eqId);
      if (eq1 && eq2) {
        bracket.push({ eq1, eq2, round: qualifiedEqs.length <= 2 ? 'Final' : 'Semi-Final' });
      }
    }

    setGeneratedBrackets(prev => ({ ...prev, [catId]: bracket }));
    addNotification(`Chave gerada para Cat ${catId}!`, 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={20} className="text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Eliminatórias</h2>
      </div>

      <div className="space-y-3">
        {activeCats.map(cat => {
          const catEqs = eqs.filter(e => e.catId === cat.id);
          if (catEqs.length === 0) return null;
          const catJogos = jogos.filter(j => j.catId === cat.id);
          const done = catJogos.filter(j => j.res).length;
          const bracket = generatedBrackets[cat.id];

          return (
            <Card key={cat.id}>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-sm">Cat {cat.id}</span>
                    <span className="text-sm text-gray-600">{catEqs.length} equipes · {done}/{catJogos.length} jogos</span>
                  </div>
                  {!bracket && (
                    <Button size="sm" variant="warning" onClick={() => generateBracket(cat.id)}>
                      <Zap size={14} className="mr-1" /> Gerar Chave
                    </Button>
                  )}
                </div>

                {bracket && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                      <AlertCircle size={14} /> Prévia da Chave
                    </p>
                    <div className="space-y-2 mb-3">
                      {bracket.map((matchup, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                          <span className="text-sm font-medium">{matchup.eq1.bandeira} {matchup.eq1.nome}</span>
                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {matchup.round}
                          </span>
                          <span className="text-sm font-medium">{matchup.eq2.nome} {matchup.eq2.bandeira}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGeneratedBrackets(p => { const n = { ...p }; delete n[cat.id]; return n; })}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Descartar
                      </button>
                    </div>
                  </div>
                )}

                {/* Group standings preview */}
                {(() => {
                  const standings = calcGroupStandings(catEqs, catJogos);
                  const grupoNums = [...new Set(catEqs.map(e => e.grupo))].sort();
                  return grupoNums.map(g => {
                    const grpEqs = catEqs.filter(e => e.grupo === g);
                    const sorted = grpEqs.map(eq => ({ eq, s: standings[eq.id] || { pts: 0, v: 0, d: 0, j: 0 } }))
                      .sort((a, b) => b.s.pts - a.s.pts || b.s.v - a.s.v);
                    return (
                      <div key={g} className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase">Grupo {g}</p>
                        <div className="space-y-1">
                          {sorted.map(({ eq, s }, idx) => (
                            <div key={eq.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${idx < 2 ? 'bg-green-50' : 'bg-gray-50'}`}>
                              <span className="w-4 text-xs text-gray-500 font-bold">{idx + 1}</span>
                              <span>{eq.bandeira}</span>
                              <span className="flex-1 font-medium text-gray-800">{eq.nome}</span>
                              <span className="text-xs text-gray-500">{s.j}J</span>
                              <span className="text-xs font-bold text-gray-700">{s.pts}pts</span>
                              {idx < 2 && <span className="text-xs text-green-600 font-bold">↑</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
