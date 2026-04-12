import { create } from 'zustand';

interface DiscoveryFilters {
  minAge: number;
  maxAge: number;
  regions: string[];
  maxDistance: number | null;
}

interface DiscoveryState {
  selectedCategory: string | null;
  filters: DiscoveryFilters;
  viewMode: 'deck' | 'daily-picks';

  setSelectedCategory: (category: string | null) => void;
  setFilters: (filters: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
  setViewMode: (mode: 'deck' | 'daily-picks') => void;
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  minAge: 18,
  maxAge: 50,
  regions: [],
  maxDistance: null,
};

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  selectedCategory: null,
  filters: DEFAULT_FILTERS,
  viewMode: 'deck',

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setViewMode: (mode) => set({ viewMode: mode }),
}));
