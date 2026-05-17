import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analysis, FilterOptions } from '../types';

const ANALYSES_KEY = '@bt_vision_analyses';

export const storageService = {
  async getAll(): Promise<Analysis[]> {
    try {
      const data = await AsyncStorage.getItem(ANALYSES_KEY);
      if (!data) return [];
      return JSON.parse(data) as Analysis[];
    } catch (err) {
      console.warn('[storageService] getAll failed:', err);
      return [];
    }
  },

  async getById(id: string): Promise<Analysis | null> {
    const analyses = await this.getAll();
    return analyses.find(a => a.id === id) || null;
  },

  async save(analysis: Analysis): Promise<void> {
    const analyses = await this.getAll();
    const existing = analyses.findIndex(a => a.id === analysis.id);
    if (existing >= 0) {
      analyses[existing] = analysis;
    } else {
      analyses.unshift(analysis);
    }
    await AsyncStorage.setItem(ANALYSES_KEY, JSON.stringify(analyses));
  },

  async delete(id: string): Promise<void> {
    const analyses = await this.getAll();
    const filtered = analyses.filter(a => a.id !== id);
    await AsyncStorage.setItem(ANALYSES_KEY, JSON.stringify(filtered));
  },

  async filter(options: FilterOptions): Promise<Analysis[]> {
    const analyses = await this.getAll();
    return analyses.filter(a => {
      if (options.type && a.type !== options.type) return false;
      if (options.search) {
        const q = options.search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) &&
            !a.athletes.some(at => at.name.toLowerCase().includes(q)) &&
            !(a.tournament?.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  },

  async seedDemo(): Promise<void> {
    const existing = await this.getAll();
    if (existing.length > 0) return;

    const demos: Analysis[] = [
      {
        id: 'demo-1',
        title: 'Treino — Dupla A vs Dupla B',
        type: 'treino',
        athletes: [
          { id: 'a1', name: 'Lucas', side: 'dupla_a' },
          { id: 'a2', name: 'Rafael', side: 'dupla_a' },
          { id: 'a3', name: 'Pedro', side: 'dupla_b' },
          { id: 'a4', name: 'Thiago', side: 'dupla_b' },
        ],
        category: 'Masculino A',
        tournament: undefined,
        date: new Date(Date.now() - 86400000).toISOString(),
        videoUri: undefined,
        videoDuration: 3600,
        rallies: Array.from({ length: 18 }, (_, i) => ({
          id: `r${i}`,
          startTime: i * 180,
          endTime: i * 180 + 45,
          winner: i % 3 === 0 ? 'dupla_b' : 'dupla_a',
          events: [],
        })),
        events: [
          { id: 'e1', type: 'smash', timestamp: 45, player: 'Lucas', team: 'dupla_a' },
          { id: 'e2', type: 'winner', timestamp: 46, player: 'Lucas', team: 'dupla_a' },
          { id: 'e3', type: 'saque', timestamp: 90, player: 'Rafael', team: 'dupla_a' },
          { id: 'e4', type: 'devolucao', timestamp: 91, player: 'Pedro', team: 'dupla_b' },
          { id: 'e5', type: 'erro_nao_forcado', timestamp: 95, player: 'Pedro', team: 'dupla_b' },
          { id: 'e6', type: 'lob', timestamp: 200, player: 'Thiago', team: 'dupla_b' },
          { id: 'e7', type: 'smash', timestamp: 205, player: 'Lucas', team: 'dupla_a' },
          { id: 'e8', type: 'winner', timestamp: 206, player: 'Lucas', team: 'dupla_a' },
          { id: 'e9', type: 'pressao', timestamp: 320, player: 'Rafael', team: 'dupla_a' },
          { id: 'e10', type: 'defesa', timestamp: 322, player: 'Thiago', team: 'dupla_b' },
          { id: 'e11', type: 'neutro', timestamp: 400, player: 'Pedro', team: 'dupla_b' },
          { id: 'e12', type: 'erro_nao_forcado', timestamp: 404, player: 'Pedro', team: 'dupla_b' },
          { id: 'e13', type: 'cobertura', timestamp: 500, player: 'Rafael', team: 'dupla_a' },
          { id: 'e14', type: 'ataque', timestamp: 502, player: 'Lucas', team: 'dupla_a' },
          { id: 'e15', type: 'recuperacao', timestamp: 600, player: 'Thiago', team: 'dupla_b' },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'demo-2',
        title: 'Copa Regional — Semifinal',
        type: 'torneio',
        athletes: [
          { id: 'b1', name: 'Marcos', side: 'dupla_a' },
          { id: 'b2', name: 'André', side: 'dupla_a' },
          { id: 'b3', name: 'Rodrigo', side: 'dupla_b' },
          { id: 'b4', name: 'Felipe', side: 'dupla_b' },
        ],
        category: 'Masculino Pro',
        tournament: 'Copa Regional 2024',
        date: new Date(Date.now() - 604800000).toISOString(),
        videoUri: undefined,
        videoDuration: 5400,
        rallies: Array.from({ length: 24 }, (_, i) => ({
          id: `r${i}`,
          startTime: i * 200,
          endTime: i * 200 + 60,
          winner: i % 4 === 0 ? 'dupla_b' : 'dupla_a',
          events: [],
        })),
        events: [
          { id: 'f1', type: 'saque', timestamp: 10, player: 'Marcos', team: 'dupla_a' },
          { id: 'f2', type: 'winner', timestamp: 12, player: 'Marcos', team: 'dupla_a' },
          { id: 'f3', type: 'smash', timestamp: 80, player: 'André', team: 'dupla_a' },
          { id: 'f4', type: 'winner', timestamp: 81, player: 'André', team: 'dupla_a' },
          { id: 'f5', type: 'pressao', timestamp: 150, player: 'Rodrigo', team: 'dupla_b' },
          { id: 'f6', type: 'pressao', timestamp: 153, player: 'Rodrigo', team: 'dupla_b' },
          { id: 'f7', type: 'pressao', timestamp: 156, player: 'Rodrigo', team: 'dupla_b' },
          { id: 'f8', type: 'erro_nao_forcado', timestamp: 158, player: 'Marcos', team: 'dupla_a' },
          { id: 'f9', type: 'lob', timestamp: 300, player: 'Felipe', team: 'dupla_b' },
          { id: 'f10', type: 'recuperacao', timestamp: 302, player: 'André', team: 'dupla_a' },
          { id: 'f11', type: 'neutro', timestamp: 400, player: 'Marcos', team: 'dupla_a' },
          { id: 'f12', type: 'neutro', timestamp: 402, player: 'Rodrigo', team: 'dupla_b' },
          { id: 'f13', type: 'erro_nao_forcado', timestamp: 405, player: 'Marcos', team: 'dupla_a' },
          { id: 'f14', type: 'cobertura', timestamp: 500, player: 'André', team: 'dupla_a' },
          { id: 'f15', type: 'ataque', timestamp: 501, player: 'André', team: 'dupla_a' },
          { id: 'f16', type: 'winner', timestamp: 502, player: 'André', team: 'dupla_a' },
          { id: 'f17', type: 'smash', timestamp: 600, player: 'Marcos', team: 'dupla_a' },
          { id: 'f18', type: 'erro_nao_forcado', timestamp: 601, player: 'Marcos', team: 'dupla_a' },
        ],
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        updatedAt: new Date(Date.now() - 604800000).toISOString(),
      },
    ];

    for (const demo of demos) {
      await this.save(demo);
    }
  },
};
