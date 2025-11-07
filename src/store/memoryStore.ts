import { create } from 'zustand';
import { MemoryForMap } from '@/types/memory';

interface MemoryStore {
  memories: MemoryForMap[];
  isLoading: boolean;
  error: string | null;
  selectedMemory: MemoryForMap | null;
  fetchMemories: () => Promise<void>;
  selectMemory: (id: string | null) => void;
  addMemory: (memory: MemoryForMap) => void;
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memories: [],
  isLoading: false,
  error: null,
  selectedMemory: null,

  fetchMemories: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/memories/map');
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error || 'Failed to fetch memories';
        const errorDetails = data.details ? ` (${data.details})` : '';
        const errorCode = data.code ? ` [Code: ${data.code}]` : '';
        throw new Error(`${errorMsg}${errorDetails}${errorCode}`);
      }

      const fetchedMemories = data.memories || [];
      console.log('[v0] MemoryStore: Fetched', fetchedMemories.length, 'memories');
      if (fetchedMemories.length > 0) {
        console.log('[v0] MemoryStore: Memory details:', fetchedMemories.map((m: MemoryForMap) => ({
          id: m.id,
          location: m.location,
          hasAudio: !!m.audioUrl,
          lat: m.latitude,
          lng: m.longitude
        })));
      } else {
        console.warn('[v0] MemoryStore: No memories returned from API');
      }
      set({ 
        memories: fetchedMemories,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch memories';
      set({ 
        error: message,
        isLoading: false
      });
      console.error('[v0] MemoryStore: Error fetching memories:', error);
    }
  },

  selectMemory: (id: string | null) => {
    if (!id) {
      set({ selectedMemory: null });
      return;
    }
    
    const memory = get().memories.find(m => m.id === id);
    set({ selectedMemory: memory || null });
  },

  addMemory: (memory: MemoryForMap) => {
    set((state) => ({
      memories: [memory, ...state.memories]
    }));
  },
}));

