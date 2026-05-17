import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Analysis, AnalysisReport, SCOUT_EVENT_CONFIG } from '../types';
import { formatDate, formatDuration, formatPercentage, getAnalysisTypeLabel } from '../utils/formatters';

function severityColor(severity: string): string {
  if (severity === 'success') return '#22C55E';
  if (severity === 'warning') return '#F59E0B';
  return '#3B82F6';
}

function severityBg(severity: string): string {
  if (severity === 'success') return '#052E16';
  if (severity === 'warning') return '#2D1A00';
  return '#0A1628';
}

function buildHtml(analysis: Analysis, report: AnalysisReport): string {
  const winRate = report.totalPoints > 0
    ? Math.round((report.pointsWon / report.totalPoints) * 100)
    : 0;

  const duplaA = analysis.athletes.filter(a => a.side === 'dupla_a').map(a => a.name).join(' / ');
  const duplaB = analysis.athletes.filter(a => a.side === 'dupla_b').map(a => a.name).join(' / ');

  const shotRows = report.shotDistribution.slice(0, 8).map(s => {
    const config = SCOUT_EVENT_CONFIG[s.type];
    return `
      <tr>
        <td style="padding:8px 12px;color:#e5e7eb;font-size:13px;">${s.label}</td>
        <td style="padding:8px 12px;text-align:center;color:${config.color};font-weight:700;font-size:13px;">${s.count}</td>
        <td style="padding:8px 12px;">
          <div style="background:#2a2a2a;border-radius:4px;height:8px;overflow:hidden;">
            <div style="height:100%;width:${s.percentage}%;background:${config.color};border-radius:4px;"></div>
          </div>
        </td>
        <td style="padding:8px 12px;text-align:right;color:#9ca3af;font-size:12px;">${s.percentage}%</td>
      </tr>`;
  }).join('');

  const playerRows = report.playerStats.map(ps => {
    const effColor = ps.efficiency >= 50 ? '#22C55E' : '#EF4444';
    return `
      <tr>
        <td style="padding:10px 12px;color:#f3f4f6;font-weight:600;font-size:13px;">${ps.playerName}</td>
        <td style="padding:10px 12px;text-align:center;color:#22C55E;font-weight:700;">${ps.winners}</td>
        <td style="padding:10px 12px;text-align:center;color:#EF4444;font-weight:700;">${ps.errors}</td>
        <td style="padding:10px 12px;text-align:center;color:#F59E0B;font-weight:700;">${ps.smashes}</td>
        <td style="padding:10px 12px;text-align:center;color:#06B6D4;font-weight:700;">${ps.lobs}</td>
        <td style="padding:10px 12px;text-align:center;">
          <span style="background:${effColor}22;color:${effColor};padding:3px 8px;border-radius:999px;font-size:12px;font-weight:700;">${ps.efficiency}%</span>
        </td>
      </tr>`;
  }).join('');

  const insightCards = report.tacticalInsights.map(insight => `
    <div style="background:${severityBg(insight.severity)};border:1px solid ${severityColor(insight.severity)}44;border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${severityColor(insight.severity)};flex-shrink:0;"></div>
        <span style="color:${severityColor(insight.severity)};font-size:13px;font-weight:700;">${insight.title}</span>
      </div>
      <p style="color:#d1d5db;font-size:13px;line-height:1.6;margin:0;">${insight.description}</p>
    </div>`).join('');

  const winRateColor = winRate >= 50 ? '#22C55E' : '#EF4444';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) td { background: #1a1a1a; }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #FF6B00;">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="background:#FF6B0022;border-radius:10px;padding:10px;">
          <div style="width:28px;height:28px;background:#FF6B00;border-radius:6px;"></div>
        </div>
        <div>
          <h1 style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">BT Vision</h1>
          <p style="font-size:11px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">Análise de Beach Tennis</p>
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <p style="font-size:11px;color:#6b7280;">Gerado em ${formatDate(new Date().toISOString())}</p>
    </div>
  </div>

  <!-- Analysis info -->
  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:20px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px;">${analysis.title}</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="background:#FF6B0022;color:#FF6B00;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;">${getAnalysisTypeLabel(analysis.type)}</span>
          <span style="background:#2a2a2a;color:#9ca3af;padding:3px 10px;border-radius:999px;font-size:12px;">${analysis.category}</span>
          ${analysis.tournament ? `<span style="background:#2a2a2a;color:#9ca3af;padding:3px 10px;border-radius:999px;font-size:12px;">${analysis.tournament}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <p style="font-size:13px;color:#9ca3af;">${formatDate(analysis.date)}</p>
        ${analysis.videoDuration ? `<p style="font-size:12px;color:#6b7280;margin-top:2px;">${formatDuration(analysis.videoDuration)} de vídeo</p>` : ''}
      </div>
    </div>

    <!-- Teams -->
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2a2a2a;display:flex;align-items:center;gap:16px;">
      <div style="flex:1;">
        <p style="font-size:10px;color:#FF6B00;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Dupla A</p>
        <p style="font-size:15px;font-weight:600;color:#fff;">${duplaA}</p>
      </div>
      <div style="padding:6px 14px;background:#252525;border-radius:999px;">
        <span style="font-size:13px;font-weight:900;color:#6b7280;letter-spacing:2px;">VS</span>
      </div>
      <div style="flex:1;text-align:right;">
        <p style="font-size:10px;color:#3B82F6;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Dupla B</p>
        <p style="font-size:15px;font-weight:600;color:#fff;">${duplaB}</p>
      </div>
    </div>
  </div>

  <!-- Win rate hero -->
  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:20px;margin-bottom:16px;display:flex;align-items:center;gap:24px;">
    <div style="flex:1;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Taxa de Pontos Ganhos</p>
      <p style="font-size:52px;font-weight:900;color:${winRateColor};line-height:1;">${winRate}%</p>
      <div style="background:#2a2a2a;border-radius:4px;height:8px;overflow:hidden;margin-top:10px;">
        <div style="height:100%;width:${winRate}%;background:${winRateColor};border-radius:4px;"></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;min-width:100px;">
      <div style="text-align:center;">
        <p style="font-size:24px;font-weight:800;color:#22C55E;">${report.pointsWon}</p>
        <p style="font-size:11px;color:#9ca3af;">Ganhos</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:24px;font-weight:800;color:#EF4444;">${report.pointsLost}</p>
        <p style="font-size:11px;color:#9ca3af;">Perdidos</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:24px;font-weight:800;color:#fff;">${report.totalPoints}</p>
        <p style="font-size:11px;color:#9ca3af;">Total</p>
      </div>
    </div>
  </div>

  <!-- Stats grid -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
    ${[
      { label: 'Winners', value: report.winners, color: '#22C55E' },
      { label: 'Erros NF', value: report.errors, color: '#EF4444' },
      { label: 'Ef. Ofensiva', value: `${report.offensiveEfficiency}%`, color: '#FF6B00' },
      { label: 'Ef. Defensiva', value: `${report.defensiveEfficiency}%`, color: '#3B82F6' },
    ].map(s => `
      <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:16px;text-align:center;">
        <p style="font-size:26px;font-weight:800;color:${s.color};">${s.value}</p>
        <p style="font-size:11px;color:#9ca3af;margin-top:4px;">${s.label}</p>
      </div>`).join('')}
  </div>

  <!-- Shot distribution -->
  ${report.shotDistribution.length > 0 ? `
  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:20px;margin-bottom:24px;">
    <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:14px;">Distribuição de Golpes</h3>
    <table>
      <thead>
        <tr style="border-bottom:1px solid #2a2a2a;">
          <th style="text-align:left;padding:6px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Golpe</th>
          <th style="text-align:center;padding:6px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Qtd</th>
          <th style="padding:6px 12px;"></th>
          <th style="text-align:right;padding:6px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">%</th>
        </tr>
      </thead>
      <tbody>${shotRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Player stats -->
  ${report.playerStats.length > 0 ? `
  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:20px;margin-bottom:24px;">
    <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:14px;">Estatísticas por Atleta</h3>
    <table>
      <thead>
        <tr style="border-bottom:1px solid #2a2a2a;">
          ${['Atleta','Winners','Erros NF','Smashes','Lobs','Ef.'].map(h =>
            `<th style="padding:6px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;text-align:${h==='Atleta'?'left':'center'};">${h}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${playerRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Tactical insights -->
  ${report.tacticalInsights.length > 0 ? `
  <div style="margin-bottom:24px;">
    <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:14px;">
      <span style="color:#FF6B00;">✦</span> Insights Táticos
    </h3>
    ${insightCards}
  </div>` : ''}

  <!-- Footer -->
  <div style="padding-top:20px;border-top:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <p style="font-size:14px;font-weight:800;color:#FF6B00;">BT Vision</p>
      <p style="font-size:11px;color:#6b7280;">Análise inteligente de Beach Tennis</p>
    </div>
    <p style="font-size:11px;color:#4b5563;">${analysis.events.length} eventos registrados • ${analysis.rallies.length} rallies</p>
  </div>

</body>
</html>`;
}

export const pdfService = {
  async generateAndShare(analysis: Analysis, report: AnalysisReport): Promise<void> {
    const html = buildHtml(analysis, report);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório — ${analysis.title}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }
  },

  async print(analysis: Analysis, report: AnalysisReport): Promise<void> {
    const html = buildHtml(analysis, report);
    await Print.printAsync({ html });
  },
};
