import { create } from 'zustand';
import type { UpdaterState } from '../types/electron';

interface UpdateStore {
  state: UpdaterState;
  setState: (state: UpdaterState) => void;
  reset: () => void;
}

const DEFAULT_STATE: UpdaterState = {
  available: false,
  version: null,
  releaseNotes: null,
  downloaded: false,
  progress: 0,
  error: null,
};

export const useUpdateStore = create<UpdateStore>((set) => ({
  state: DEFAULT_STATE,
  setState: (state) => set({ state }),
  reset: () => set({ state: DEFAULT_STATE }),
}));
