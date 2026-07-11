// Vox Mobile — Discovery state store
// Tracks whether the app is still locating the backend server on the network.

import { create } from 'zustand';

interface DiscoveryState {
  isDiscovering: boolean;
  discoveredUrl: string | null;
  discoveryError: string | null;

  setDiscovering: (v: boolean) => void;
  setDiscoveredUrl: (url: string) => void;
  setDiscoveryError: (msg: string) => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  isDiscovering: false,
  discoveredUrl: null,
  discoveryError: null,

  setDiscovering: (v) => set({ isDiscovering: v }),
  setDiscoveredUrl: (url) => set({ discoveredUrl: url, isDiscovering: false }),
  setDiscoveryError: (msg) => set({ discoveryError: msg, isDiscovering: false }),
}));
