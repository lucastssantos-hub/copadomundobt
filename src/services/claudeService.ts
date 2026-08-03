/**
 * claudeService — integração real com a API de Mensagens do Claude (Anthropic).
 *
 * Segue padrões do Anthropic Cookbook (https://github.com/anthropics/anthropic-cookbook):
 *  - "Enable JSON mode": prefill do turno do assistente com `{` para forçar
 *    saída JSON consistente e fácil de parsear.
 *  - Prompt engineering: system prompt com papel + regras, dados estruturados
 *    no turno do usuário, e schema explícito da resposta esperada.
 *  - Tratamento de erros robusto para chamadas de rede.
 *
 * Docs da API: https://docs.anthropic.com/en/api/messages
 */
import { Analysis, AnalysisReport, TacticalInsight } from '../types';
import { anthropicConfig, isClaudeConfigured } from '../config/env';

export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super('A API do Claude não está configurada. Defina EXPO_PUBLIC_ANTHROPIC_API_KEY.');
    this.name = 'ClaudeNotConfiguredError';
  }
}

export class ClaudeApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ClaudeApiError';
    this.status = status;
  }
}

interface MessagesResponse {
  content: Array<{ type: string; text?: string }>;
}

const VALID_CATEGORIES: TacticalInsight['category'][] = [
  'gestao_risco', 'gestao_tempo', 'pressao', 'organizacao', 'padrao',
];
const VALID_SEVERITIES: TacticalInsight['severity'][] = ['info', 'warning', 'success'];

/**
 * Chamada de baixo nível à API de Mensagens do Claude.
 * Retorna o texto completo da resposta do modelo.
 */
async function createMessage(params: {
  system: string;
  userContent: string;
  /** Prefill do turno do assistente para forçar um formato de saída. */
  prefill?: string;
  maxTokens?: number;
}): Promise<string> {
  if (!isClaudeConfigured()) {
    throw new ClaudeNotConfiguredError();
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: params.userContent },
  ];
  if (params.prefill) {
    messages.push({ role: 'assistant', content: params.prefill });
  }

  let response: Response;
  try {
    response = await fetch(`${anthropicConfig.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicConfig.apiKey,
        'anthropic-version': anthropicConfig.apiVersion,
        // Necessário apenas ao chamar a API diretamente de um browser (Expo web).
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: anthropicConfig.model,
        max_tokens: params.maxTokens ?? 1024,
        system: params.system,
        messages,
      }),
    });
  } catch (err) {
    throw new ClaudeApiError(`Falha de rede ao contatar o Claude: ${(err as Error).message}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await response.json());
    } catch {
      detail = await response.text().catch(() => '');
    }
    throw new ClaudeApiError(`Erro da API do Claude (${response.status}): ${detail}`, response.status);
  }

  const data = (await response.json()) as MessagesResponse;
  const text = data.content?.find(b => b.type === 'text')?.text ?? '';
  // Reanexa o prefill, já que o modelo continua a partir dele.
  return (params.prefill ?? '') + text;
}

/** Extrai e parseia o primeiro objeto JSON encontrado no texto. */
function parseJsonObject<T>(raw: string): T {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new ClaudeApiError('Resposta do Claude não continha JSON válido.');
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

/** Constrói um resumo textual compacto da análise para enviar ao modelo. */
function buildAnalysisSummary(analysis: Analysis, report: AnalysisReport): string {
  const winRate = report.totalPoints > 0
    ? Math.round((report.pointsWon / report.totalPoints) * 100)
    : 0;

  const shots = report.shotDistribution
    .map(s => `${s.label}: ${s.count} (${s.percentage}%)`)
    .join(', ');

  const players = report.playerStats
    .map(p => `${p.playerName} — winners ${p.winners}, erros ${p.errors}, smashes ${p.smashes}, lobs ${p.lobs}, eficiência ${p.efficiency}%`)
    .join('; ');

  return [
    `Título: ${analysis.title}`,
    `Tipo: ${analysis.type}${analysis.tournament ? ` (${analysis.tournament})` : ''}`,
    `Categoria: ${analysis.category}`,
    `Total de pontos: ${report.totalPoints} | Ganhos: ${report.pointsWon} | Perdidos: ${report.pointsLost} | Taxa: ${winRate}%`,
    `Winners: ${report.winners} | Erros não forçados: ${report.errors} | Aces: ${report.aces}`,
    `Eficiência ofensiva: ${report.offensiveEfficiency}% | Eficiência defensiva: ${report.defensiveEfficiency}%`,
    `Rally médio: ${report.averageRallyLength.toFixed(1)}s | Rally mais longo: ${report.longestRally}s`,
    `Distribuição de golpes: ${shots || 'sem dados'}`,
    `Atletas: ${players || 'sem dados'}`,
  ].join('\n');
}

const SYSTEM_PROMPT = `Você é um analista tático especialista em Beach Tennis, ajudando duplas e treinadores a melhorar o desempenho.
A partir de estatísticas de uma partida/treino, gere insights táticos objetivos, específicos e acionáveis em português do Brasil.
Baseie-se apenas nos dados fornecidos — não invente números. Seja direto e técnico, no tom de um coach experiente.`;

/**
 * Gera insights táticos ricos usando o Claude a partir dos dados da análise.
 * Usa o padrão de "JSON mode" do Cookbook (prefill com `{`) para garantir
 * uma saída estruturada que mapeia diretamente para `TacticalInsight[]`.
 */
export async function generateTacticalInsights(
  analysis: Analysis,
  report: AnalysisReport,
): Promise<TacticalInsight[]> {
  const summary = buildAnalysisSummary(analysis, report);

  const userContent = `Dados da análise de Beach Tennis:

${summary}

Gere de 3 a 5 insights táticos. Responda APENAS com um objeto JSON no formato exato:
{
  "insights": [
    {
      "category": "gestao_risco" | "gestao_tempo" | "pressao" | "organizacao" | "padrao",
      "title": "título curto (máx. 4 palavras)",
      "description": "análise específica e acionável (1-2 frases)",
      "severity": "info" | "warning" | "success"
    }
  ]
}`;

  const raw = await createMessage({
    system: SYSTEM_PROMPT,
    userContent,
    prefill: '{',
    maxTokens: 1500,
  });

  const parsed = parseJsonObject<{ insights?: Array<Partial<TacticalInsight>> }>(raw);
  const items = Array.isArray(parsed.insights) ? parsed.insights : [];

  return items
    .filter(i => i && typeof i.description === 'string' && i.description.length > 0)
    .map((i, idx) => ({
      id: `ai-${idx + 1}`,
      category: VALID_CATEGORIES.includes(i.category as TacticalInsight['category'])
        ? (i.category as TacticalInsight['category'])
        : 'padrao',
      title: (i.title || 'Insight Tático').toString().slice(0, 40),
      description: i.description!.toString(),
      severity: VALID_SEVERITIES.includes(i.severity as TacticalInsight['severity'])
        ? (i.severity as TacticalInsight['severity'])
        : 'info',
    }));
}

export const claudeService = {
  generateTacticalInsights,
  isConfigured: isClaudeConfigured,
};
