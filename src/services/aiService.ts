import { AISuggestion, ScoutEvent } from '../types';

function randomDelay(min = 300, max = 1200): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

export const aiService = {
  async detectRallyStart(videoTimestamp: number): Promise<AISuggestion | null> {
    await randomDelay();
    if (Math.random() > 0.3) {
      return {
        type: 'rally_start',
        timestamp: videoTimestamp,
        confidence: 0.7 + Math.random() * 0.25,
        description: 'Possível início de rally detectado',
      };
    }
    return null;
  },

  async detectRallyEnd(videoTimestamp: number): Promise<AISuggestion | null> {
    await randomDelay();
    if (Math.random() > 0.35) {
      return {
        type: 'rally_end',
        timestamp: videoTimestamp,
        confidence: 0.65 + Math.random() * 0.3,
        description: 'Possível fim de rally detectado',
      };
    }
    return null;
  },

  async detectPossibleSmash(videoTimestamp: number): Promise<AISuggestion | null> {
    await randomDelay(200, 800);
    if (Math.random() > 0.6) {
      return {
        type: 'possible_smash',
        timestamp: videoTimestamp,
        confidence: 0.55 + Math.random() * 0.35,
        description: 'Possível smash detectado — confirmar?',
      };
    }
    return null;
  },

  async detectMovementPattern(events: ScoutEvent[]): Promise<AISuggestion[]> {
    await randomDelay(500, 1500);
    const suggestions: AISuggestion[] = [];

    if (events.length > 5) {
      suggestions.push({
        type: 'movement_pattern',
        timestamp: 0,
        confidence: 0.72,
        description: 'Padrão de deslocamento para backhand detectado após saques curtos',
      });
    }

    if (events.filter(e => e.type === 'pressao').length > 3) {
      suggestions.push({
        type: 'movement_pattern',
        timestamp: 0,
        confidence: 0.68,
        description: 'Sequência de pressão detectada — dupla usa 3+ ações para criar ponto',
      });
    }

    return suggestions;
  },

  async analyzeVideo(videoUri: string): Promise<{ suggestions: AISuggestion[]; ralliesDetected: number }> {
    await randomDelay(2000, 4000);
    return {
      suggestions: [
        {
          type: 'rally_start',
          timestamp: 12,
          confidence: 0.88,
          description: 'Início de rally detectado',
        },
        {
          type: 'possible_smash',
          timestamp: 45,
          confidence: 0.74,
          description: 'Possível smash na diagonal',
        },
        {
          type: 'rally_end',
          timestamp: 48,
          confidence: 0.91,
          description: 'Fim de rally detectado',
        },
      ],
      ralliesDetected: Math.floor(8 + Math.random() * 15),
    };
  },
};
