import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Assessment, AXIS_CONFIG, LEVEL_CONFIG, Student } from '../types/students';
import { axisTrends, currentProfile, overallScore } from '../utils/evolution';
import { formatDate } from '../utils/formatters';

function buildHtml(student: Student, assessments: Assessment[]): string {
  const profile = currentProfile(assessments);
  const trends = axisTrends(assessments);
  const overall = overallScore(profile);
  const level = LEVEL_CONFIG[student.level];

  const sorted = [...assessments].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = sorted.length > 0 ? formatDate(sorted[0].date) : '—';
  const lastDate = sorted.length > 0 ? formatDate(sorted[sorted.length - 1].date) : '—';

  const axisRows = trends.map(t => {
    const config = AXIS_CONFIG[t.axis];
    const value = t.current ?? 0;
    const pct = (value / 5) * 100;
    const deltaHtml = t.delta != null && t.delta !== 0
      ? `<span style="color:${t.delta > 0 ? '#22C55E' : '#EF4444'};font-size:12px;font-weight:700;margin-left:8px;">${t.delta > 0 ? '▲ +' : '▼ '}${t.delta}</span>`
      : '';
    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="color:#e5e7eb;font-size:14px;font-weight:600;">${config.label}</span>
          <span>
            <span style="color:${config.color};font-size:16px;font-weight:800;">${t.current != null ? t.current : '—'}</span>
            <span style="color:#6b7280;font-size:12px;">/5</span>
            ${deltaHtml}
          </span>
        </div>
        <div style="background:#2a2a2a;border-radius:5px;height:10px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${config.color};border-radius:5px;"></div>
        </div>
      </div>`;
  }).join('');

  const lastNotes = [...assessments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(a => a.note)
    .slice(0, 3)
    .map(a => `
      <div style="background:#141414;border:1px solid #2a2a2a;border-radius:10px;padding:12px;margin-bottom:8px;">
        <p style="color:#9ca3af;font-size:11px;margin-bottom:4px;">${formatDate(a.date)}</p>
        <p style="color:#d1d5db;font-size:13px;line-height:1.5;">${a.note}</p>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; }
  </style>
</head>
<body>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #FF6B00;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="background:#FF6B0022;border-radius:10px;padding:10px;">
        <div style="width:28px;height:28px;background:#FF6B00;border-radius:6px;"></div>
      </div>
      <div>
        <h1 style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">BT Vision</h1>
        <p style="font-size:11px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">Boletim de Evolução</p>
      </div>
    </div>
    <p style="font-size:11px;color:#6b7280;">Gerado em ${formatDate(new Date().toISOString())}</p>
  </div>

  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <h2 style="font-size:24px;font-weight:800;color:#fff;margin-bottom:6px;">${student.name}</h2>
      <span style="background:${level.color}22;color:${level.color};padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;">${level.label}</span>
      <p style="font-size:12px;color:#6b7280;margin-top:10px;">${assessments.length} avaliações • ${firstDate} a ${lastDate}</p>
    </div>
    <div style="text-align:center;background:#FF6B0018;border:1px solid #FF6B0044;border-radius:14px;padding:16px 24px;">
      <p style="font-size:40px;font-weight:900;color:#FF6B00;line-height:1;">${overall != null ? overall.toFixed(1) : '—'}</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:6px;text-transform:uppercase;letter-spacing:0.8px;">Nota geral</p>
    </div>
  </div>

  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:20px;margin-bottom:20px;">
    <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:16px;">Fundamentos</h3>
    ${axisRows}
  </div>

  ${lastNotes.length > 0 ? `
  <div style="margin-bottom:20px;">
    <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:12px;">
      <span style="color:#FF6B00;">✦</span> Observações do professor
    </h3>
    ${lastNotes}
  </div>` : ''}

  <div style="padding-top:20px;border-top:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <p style="font-size:14px;font-weight:800;color:#FF6B00;">BT Vision</p>
      <p style="font-size:11px;color:#6b7280;">Evolução inteligente no Beach Tennis</p>
    </div>
    <p style="font-size:11px;color:#4b5563;">Continue treinando! 🎾</p>
  </div>

</body>
</html>`;
}

export const reportCardService = {
  async generateAndShare(student: Student, assessments: Assessment[]): Promise<void> {
    const html = buildHtml(student, assessments);

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Boletim — ${student.name}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }
  },
};
