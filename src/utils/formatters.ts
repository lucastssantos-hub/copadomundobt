import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnalysisType } from '../types';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function getAnalysisTypeLabel(type: AnalysisType): string {
  const labels: Record<AnalysisType, string> = {
    treino: 'Treino',
    torneio: 'Torneio',
    amistoso: 'Amistoso',
  };
  return labels[type];
}

export function getAnalysisTypeColor(type: AnalysisType): string {
  const colors: Record<AnalysisType, string> = {
    treino: '#3B82F6',
    torneio: '#FF6B00',
    amistoso: '#22C55E',
  };
  return colors[type];
}
