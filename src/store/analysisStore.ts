import { create } from 'zustand';
import { Analysis, ScoutEvent, FilterOptions } from '../types';
import { storageService } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisState {
  analyses: Analysis[];
  activeAnalysis: Analysis | null;
  isLoading: boolean;
  filter: FilterOptions;

  loadAnalyses: () => Promise<void>;
  setFilter: (filter: FilterOptions) => void;
  createAnalysis: (data: Omit<Analysis, 'id' | 'events' | 'rallies' | 'createdAt' | 'updatedAt'>) => Promise<Analysis>;
  loadAnalysis: (id: string) => Promise<void>;
  setActiveAnalysis: (analysis: Analysis | null) => void;
  addEvent: (analysisId: string, event: Omit<ScoutEvent, 'id'>) => Promise<void>;
  removeEvent: (analysisId: string, eventId: string) => Promise<void>;
  updateVideoUri: (analysisId: string, uri: string, duration?: number) => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  seedDemo: () => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analyses: [],
  activeAnalysis: null,
  isLoading: false,
  filter: {},

  loadAnalyses: async () => {
    set({ isLoading: true });
    try {
      const { filter } = get();
      const data = Object.keys(filter).length > 0
        ? await storageService.filter(filter)
        : await storageService.getAll();
      set({ analyses: data });
    } finally {
      set({ isLoading: false });
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadAnalyses();
  },

  createAnalysis: async (data) => {
    const now = new Date().toISOString();
    const analysis: Analysis = {
      ...data,
      id: uuidv4(),
      events: [],
      rallies: [],
      createdAt: now,
      updatedAt: now,
    };
    await storageService.save(analysis);
    await get().loadAnalyses();
    return analysis;
  },

  loadAnalysis: async (id) => {
    const analysis = await storageService.getById(id);
    set({ activeAnalysis: analysis });
  },

  setActiveAnalysis: (analysis) => set({ activeAnalysis: analysis }),

  addEvent: async (analysisId, eventData) => {
    const analysis = await storageService.getById(analysisId);
    if (!analysis) return;

    const event: ScoutEvent = { ...eventData, id: uuidv4() };
    const updated: Analysis = {
      ...analysis,
      events: [...analysis.events, event].sort((a, b) => a.timestamp - b.timestamp),
      updatedAt: new Date().toISOString(),
    };

    await storageService.save(updated);
    set({ activeAnalysis: updated });
    await get().loadAnalyses();
  },

  removeEvent: async (analysisId, eventId) => {
    const analysis = await storageService.getById(analysisId);
    if (!analysis) return;

    const updated: Analysis = {
      ...analysis,
      events: analysis.events.filter(e => e.id !== eventId),
      updatedAt: new Date().toISOString(),
    };

    await storageService.save(updated);
    set({ activeAnalysis: updated });
  },

  updateVideoUri: async (analysisId, uri, duration) => {
    const analysis = await storageService.getById(analysisId);
    if (!analysis) return;

    const updated: Analysis = {
      ...analysis,
      videoUri: uri,
      videoDuration: duration,
      updatedAt: new Date().toISOString(),
    };

    await storageService.save(updated);
    set({ activeAnalysis: updated });
    await get().loadAnalyses();
  },

  deleteAnalysis: async (id) => {
    await storageService.delete(id);
    const { activeAnalysis } = get();
    if (activeAnalysis?.id === id) set({ activeAnalysis: null });
    await get().loadAnalyses();
  },

  seedDemo: async () => {
    await storageService.seedDemo();
    await get().loadAnalyses();
  },
}));
