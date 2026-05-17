export type ScoutEventType =
  | 'saque'
  | 'devolucao'
  | 'smash'
  | 'lob'
  | 'winner'
  | 'erro_nao_forcado'
  | 'ataque'
  | 'neutro'
  | 'defesa'
  | 'pressao'
  | 'cobertura'
  | 'recuperacao';

export type AnalysisType = 'treino' | 'torneio' | 'amistoso';

export type TeamSide = 'dupla_a' | 'dupla_b';

export interface Athlete {
  id: string;
  name: string;
  side: TeamSide;
}

export interface ScoutEvent {
  id: string;
  type: ScoutEventType;
  timestamp: number;
  player: string;
  team: TeamSide;
  note?: string;
  aiSuggested?: boolean;
}

export interface Rally {
  id: string;
  startTime: number;
  endTime?: number;
  winner?: TeamSide;
  events: ScoutEvent[];
}

export interface Analysis {
  id: string;
  title: string;
  type: AnalysisType;
  athletes: Athlete[];
  category: string;
  tournament?: string;
  date: string;
  videoUri?: string;
  videoDuration?: number;
  rallies: Rally[];
  events: ScoutEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ShotDistribution {
  type: ScoutEventType;
  count: number;
  percentage: number;
  label: string;
}

export interface TacticalInsight {
  id: string;
  category: 'gestao_risco' | 'gestao_tempo' | 'pressao' | 'organizacao' | 'padrao';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
}

export interface AnalysisReport {
  analysisId: string;
  totalPoints: number;
  pointsWon: number;
  pointsLost: number;
  winners: number;
  errors: number;
  aces: number;
  offensiveEfficiency: number;
  defensiveEfficiency: number;
  shotDistribution: ShotDistribution[];
  playerStats: PlayerStats[];
  tacticalInsights: TacticalInsight[];
  longestRally: number;
  averageRallyLength: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  winners: number;
  errors: number;
  smashes: number;
  lobs: number;
  pressureReceived: number;
  efficiency: number;
}

export interface AISuggestion {
  type: 'rally_start' | 'rally_end' | 'possible_smash' | 'possible_winner' | 'movement_pattern';
  timestamp: number;
  confidence: number;
  description: string;
}

export interface FilterOptions {
  type?: AnalysisType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const SCOUT_EVENT_CONFIG: Record<ScoutEventType, { label: string; color: string; category: string }> = {
  saque: { label: 'Saque', color: '#3B82F6', category: 'Fundamento' },
  devolucao: { label: 'Devolução', color: '#8B5CF6', category: 'Fundamento' },
  smash: { label: 'Smash', color: '#EF4444', category: 'Ataque' },
  lob: { label: 'Lob', color: '#F59E0B', category: 'Defesa' },
  winner: { label: 'Winner', color: '#22C55E', category: 'Resultado' },
  erro_nao_forcado: { label: 'Erro NF', color: '#EF4444', category: 'Resultado' },
  ataque: { label: 'Ataque', color: '#F97316', category: 'Tático' },
  neutro: { label: 'Neutro', color: '#6B7280', category: 'Tático' },
  defesa: { label: 'Defesa', color: '#06B6D4', category: 'Tático' },
  pressao: { label: 'Pressão', color: '#EC4899', category: 'Tático' },
  cobertura: { label: 'Cobertura', color: '#14B8A6', category: 'Tático' },
  recuperacao: { label: 'Recuperação', color: '#84CC16', category: 'Tático' },
};
