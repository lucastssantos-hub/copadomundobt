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
  const { teams, athletes, groups, matches, standings } = useApp();
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

        const teamById = Object.fromEntries(teams.map(t => [t.id, t.name]));

        for (const match of matches) {
          const team1 = teamById[match.team1Id] ?? match.team1Id;
          const team2 = teamById[match.team2Id] ?? match.team2Id;
          const result = match.result
            ? `${match.result.team1Score} x ${match.result.team2Score}`
            : '';
          lines.push(row(
            match.id,
            match.category,
            team1,
            team2,
            match.status,
            result,
          ));
        }

        // ── Section 4: Standings ───────────────────────────────────────────
        lines.push(sectionHeader('CLASSIFICAÇÃO'));
        lines.push(row('grupo', 'posicao', 'equipe', 'jogados', 'vitorias', 'derrotas', 'pontos'));

        const groupById = Object.fromEntries(groups.map(g => [g.id, g]));

        for (const [groupId, rows] of Object.entries(standings)) {
          const group = groupById[groupId];
          const groupLabel = group ? group.name : groupId;
          rows.forEach((entry, index) => {
            const teamName = teamById[entry.teamId] ?? entry.teamId;
            lines.push(row(
              groupLabel,
              index + 1,
              teamName,
              entry.played,
              entry.wins,
              entry.losses,
              entry.points,
            ));
          });
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
