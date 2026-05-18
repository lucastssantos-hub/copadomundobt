import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { Card, CardBody, CardHeader } from '../common/Card';

function calcStandings(eqs, jogos) {
  const map = {};
  for (const eq of eqs) {
    map[eq.id] = { eqId: eq.id, j: 0, v: 0, d: 0, gv: 0, gd: 0, pts: 0 };
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

export function AdmStandings() {
  const { state } = useApp();
  const eqs = state.eqs || [];
  const jogos = state.jogos || [];
  const cats = state.cats || [];
  const [filterCat, setFilterCat] = useState('all');

  const catOptions = cats.length > 0 ? cats.map(c => c.id) : CATEGORIES;
  const filteredCats = filterCat === 'all' ? catOptions : [filterCat];

  const standings = calcStandings(eqs, jogos);

  const groups = [];
  for (const catId of filteredCats) {
    const catEqs = eqs.filter(e => e.catId === catId);
    const grupoNums = [...new Set(catEqs.map(e => e.grupo))].sort((a, b) => a - b);
    for (const g of grupoNums) {
      const grpEqs = catEqs.filter(e => e.grupo === g);
      if (grpEqs.length === 0) continue;
      groups.push({ catId, grupo: g, eqs: grpEqs });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Classificação</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...catOptions].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCat === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {cat === 'all' ? 'Todas' : `Cat ${cat}`}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhum grupo encontrado.</p></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {groups.map(({ catId, grupo, eqs: grpEqs }) => {
            const rows = grpEqs.map(eq => ({ eq, s: standings[eq.id] || { j: 0, v: 0, d: 0, gv: 0, gd: 0, pts: 0 } }))
              .sort((a, b) => b.s.pts - a.s.pts || b.s.v - a.s.v || (b.s.gv - b.s.gd) - (a.s.gv - a.s.gd));
            return (
              <Card key={`${catId}-${grupo}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    <h3 className="font-bold text-gray-900">Cat {catId} · Grupo {grupo}</h3>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <th className="text-left px-4 py-2.5">#</th>
                          <th className="text-left px-4 py-2.5">Equipe</th>
                          <th className="px-3 py-2.5 text-center">J</th>
                          <th className="px-3 py-2.5 text-center">V</th>
                          <th className="px-3 py-2.5 text-center">D</th>
                          <th className="px-3 py-2.5 text-center">GV</th>
                          <th className="px-3 py-2.5 text-center">GD</th>
                          <th className="px-3 py-2.5 text-center font-bold text-gray-700">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ eq, s }, idx) => {
                          const isQualified = idx < 2 && s.j > 0;
                          return (
                            <tr key={eq.id} className={`border-b border-gray-100 last:border-0 ${isQualified ? 'bg-green-50/40' : ''}`}>
                              <td className="px-4 py-3">
                                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                  idx === 0 ? 'bg-yellow-400 text-white' :
                                  idx === 1 ? 'bg-gray-400 text-white' :
                                  idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>{idx + 1}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{eq.bandeira}</span>
                                  <span className="font-semibold text-gray-800">{eq.nome}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-gray-600">{s.j}</td>
                              <td className="px-3 py-3 text-center text-green-600 font-semibold">{s.v}</td>
                              <td className="px-3 py-3 text-center text-red-500">{s.d}</td>
                              <td className="px-3 py-3 text-center text-gray-600">{s.gv}</td>
                              <td className="px-3 py-3 text-center text-gray-600">{s.gd}</td>
                              <td className="px-3 py-3 text-center font-bold text-gray-900 text-base">{s.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">🟢 Top 2 classificados para eliminatórias</p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
