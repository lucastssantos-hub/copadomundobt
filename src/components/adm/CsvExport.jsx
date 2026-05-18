import { useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

// UTF-8 BOM for Excel compatibility
const BOM = '﻿';
const SEP = ';';

function esc(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Wrap in quotes if it contains the separator, quotes or newlines
  if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...cols) {
  return cols.map(esc).join(SEP);
}

function sectionHeader(title) {
  return `\n${row('===', title, '===')}\n`;
}

export function CsvExport() {
  const { state } = useApp();
  const teams = (state.eqs || []).map(e => ({ id: e.id, name: e.nome, category: e.catId, flag: e.bandeira }));
  const athletes = (state.atls || []).map(a => ({ id: a.id, name: a.nome, teamId: a.eqId, gender: a.sexo, number: 0 }));
  const matches = (state.jogos || []);
  const eqsById = Object.fromEntries((state.eqs || []).map(e => [e.id, e]));
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);

    // Use setTimeout to let the "Exportando..." label render before blocking work
    setTimeout(() => {
      try {
        const lines = [BOM];

        // ── Section 1: Teams ───────────────────────────────────────────────
        lines.push(sectionHeader('EQUIPES'));
        lines.push(row('id', 'nome', 'categoria', 'bandeira'));
        for (const team of teams) {
          lines.push(row(team.id, team.name, team.category, team.flag ?? ''));
        }

        // ── Section 2: Athletes ────────────────────────────────────────────
        lines.push(sectionHeader('ATLETAS'));
        lines.push(row('id', 'nome', 'equipeId', 'genero', 'numero'));
        for (const athlete of athletes) {
          lines.push(row(
            athlete.id,
            athlete.name,
            athlete.teamId,
            athlete.gender,
            athlete.number ?? 0,
          ));
        }

        // ── Section 3: Matches ─────────────────────────────────────────────
        lines.push(sectionHeader('CONFRONTOS'));
        lines.push(row('id', 'categoria', 'equipe1', 'equipe2', 'status', 'resultado'));

        for (const jogo of matches) {
          const eq1 = eqsById[jogo.e1];
          const eq2 = eqsById[jogo.e2];
          const det = jogo.det || {};
          const resultStr = jogo.res || '';
          lines.push(row(
            jogo.id,
            jogo.catId,
            eq1?.nome ?? jogo.e1,
            eq2?.nome ?? jogo.e2,
            jogo.res ? 'finalizado' : jogo.quadra ? 'em_quadra' : 'pendente',
            resultStr,
          ));
        }

        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'copa-bt-2026.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Erro ao exportar CSV:', err);
      } finally {
        setExporting(false);
      }
    }, 50);
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150 active:scale-95"
    >
      <Download size={16} />
      {exporting ? 'Exportando...' : 'Exportar CSV'}
    </button>
  );
}
