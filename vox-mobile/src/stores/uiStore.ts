// Vox Mobile — UI store (toasts, modals, theme)

import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

interface UIState {
  toasts: Toast[];
  activeModal: string | null;
  theme: 'void' | 'crimson' | 'ocean' | 'toxic' | 'gold' | 'specter' | 'sunset' | 'midnight';

  // Actions
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  openModal: (name: string) => void;
  closeModal: () => void;
  setTheme: (theme: UIState['theme']) => void;
  reset: () => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  activeModal: null,
  theme: 'void',

  showToast: (message, type = 'info', duration = 3000) => {
    const id = `toast_${++toastCounter}`;
    set(state => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  setTheme: (theme) => set({ theme }),

  reset: () => set({ toasts: [], activeModal: null }),
}));
