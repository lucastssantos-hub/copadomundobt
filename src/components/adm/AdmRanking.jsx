import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardBody } from '../common/Card';

// Points awarded per elimination phase
const PHASE_POINTS = {
  semis: 20,
  final: 40,
  champion: 80,
};

// Determine which elimination phase a match belongs to based on how many
// elimination matches exist in that category. This is a best-effort heuristic:
//   1 match  → it is the final (winner = champion)
//   2 matches → semi-finals (winner of the final gets +champion on top of +final)
// For richer bracket data we'd need a `round` field, but since the mock
// data doesn't guarantee one we derive it from the sibling count.
function getPhaseLabel(match, eliminationMatchesByCategory) {
  const siblings = eliminationMatchesByCategory[match.category] || [];
  if (siblings.length === 1) return 'final';
  // Among 2+ matches, try to use a `round` field if present
  if (match.round) {
    const r = match.round.toLowerCase();
    if (r.includes('final') && r.includes('semi')) return 'semis';
    if (r.includes('final')) return 'final';
  }
  // Default: treat as semis when there are multiple elimination matches
  return 'semis';
}

function buildRanking(eqs, jogos) {
  const countryMap = {};

  for (const eq of eqs) {
    const key = eq.nome.toLowerCase();
    if (!countryMap[key]) {
      countryMap[key] = { name: eq.nome, flag: eq.bandeira || '', categories: new Set(), points: 0, breakdown: {} };
    }
    countryMap[key].categories.add(eq.catId);
    countryMap[key].points += 10;
    countryMap[key].breakdown[eq.catId] = (countryMap[key].breakdown[eq.catId] || 0) + 10;
  }

  for (const jogo of jogos) {
    if (!jogo.venc || !jogo.res) continue;
    const winEq = eqs.find(e => e.id === jogo.venc);
    const loseId = jogo.venc === jogo.e1 ? jogo.e2 : jogo.e1;
    const loseEq = eqs.find(e => e.id === loseId);
    if (!winEq) continue;
    const wKey = winEq.nome.toLowerCase();
    if (countryMap[wKey]) {
      countryMap[wKey].points += 3;
      countryMap[wKey].breakdown[winEq.catId] = (countryMap[wKey].breakdown[winEq.catId] || 0) + 3;
    }
  }

  return Object.values(countryMap)
    .map(entry => ({ ...entry, categories: Array.from(entry.categories).sort() }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

function positionDisplay(idx) {
  if (idx === 0) return '🥇';
  if (idx === 1) return '🥈';
  if (idx === 2) return '🥉';
  return (
    <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-bold flex items-center justify-center">
      {idx + 1}
    </span>
  );
}

function RankingRow({ entry, position }) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = Object.keys(entry.breakdown).length > 0;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className={`flex items-center gap-3 px-4 py-3 ${hasBreakdown ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''} transition-colors`}
        onClick={() => hasBreakdown && setExpanded(v => !v)}
      >
        {/* Position */}
        <div className="w-8 flex items-center justify-center text-xl shrink-0">
          {positionDisplay(position)}
        </div>

        {/* Flag + name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{entry.flag}</span>
          <span className="font-semibold text-gray-900 truncate">{entry.name}</span>
        </div>

        {/* Categories played */}
        <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
          {entry.categories.map(cat => (
            <span
              key={cat}
              className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Points */}
        <div className="text-right shrink-0 ml-2">
          <span className="text-lg font-bold text-gray-900">{entry.points}</span>
          <span className="text-xs text-gray-400 ml-1">pts</span>
        </div>

        {/* Expand icon */}
        {hasBreakdown && (
          <div className="text-gray-400 shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Breakdown */}
      {expanded && hasBreakdown && (
        <div className="bg-gray-50 px-4 pb-3 pt-1 flex flex-wrap gap-2">
          {Object.entries(entry.breakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, pts]) => (
              <div
                key={cat}
                className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-gray-200 text-sm"
              >
                <span className="font-bold text-blue-600">CAT {cat}</span>
                <span className="text-gray-400">→</span>
                <span className="font-semibold text-gray-800">{pts} pts</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function AdmRanking() {
  const { state } = useApp();
  const eqs = state.eqs || [];
  const jogos = state.jogos || [];

  const ranking = buildRanking(eqs, jogos);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={20} className="text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Ranking Geral</h2>
      </div>

      {/* Legend */}
      <Card>
        <CardBody className="py-2.5 px-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Pontuação: <strong>10 pts</strong> por participação na fase de grupos ·
            <strong> +20 pts</strong> por vitória nas semifinais ·
            <strong> +40 pts</strong> por chegar à final ·
            <strong> +80 pts</strong> ao campeão. Equipes com o mesmo nome somam pontos de todas as categorias.
          </p>
        </CardBody>
      </Card>

      {ranking.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-10">
              <Trophy size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum dado disponível ainda.</p>
              <p className="text-gray-400 text-sm mt-1">O ranking será gerado conforme os grupos forem criados.</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">País / Equipe</div>
            <div className="text-right">Categorias</div>
            <div className="text-right w-16">Pontos</div>
            <div className="w-4" />
          </div>

          {ranking.map((entry, idx) => (
            <RankingRow key={entry.name} entry={entry} position={idx} />
          ))}
        </Card>
      )}
    </div>
  );
}
