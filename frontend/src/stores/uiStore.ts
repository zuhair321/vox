import { create } from 'zustand';

let toastCounter = 0;

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'pin' | 'mention';
  message: string;
  /** Optional label for the action button */
  actionLabel?: string;
  /** Optional callback when the action button is clicked */
  onAction?: () => void;
  /** Custom duration in ms (default 3000). Set to 0 for persistent. */
  duration?: number;
}

interface UiStore {
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning' | 'pin' | 'mention', opts?: Partial<Pick<ToastMessage, 'actionLabel' | 'onAction' | 'duration'>>) => void;
  removeToast: (id: string) => void;

  isCreateServerOpen: boolean;
  setCreateServerOpen: (open: boolean) => void;

  isCreateChannelOpen: boolean;
  setCreateChannelOpen: (open: boolean) => void;

  profilePopupUser: any | null;
  profilePopupPosition: { x: number, y: number } | null;
  openProfilePopup: (user: any, position: { x: number, y: number }) => void;
  closeProfilePopup: () => void;

  // Thread panel
  threadMessageId: string | null;
  setThreadMessageId: (id: string | null) => void;

  // Pinned panel
  showPinnedPanel: boolean;
  setShowPinnedPanel: (show: boolean) => void;

  // Search panel
  showSearchPanel: boolean;
  setShowSearchPanel: (show: boolean) => void;

  // Invite modal
  inviteModalServerId: string | null;
  setInviteModalOpen: (serverId: string | null) => void;

  // Discover page
  showDiscover: boolean;
  setShowDiscover: (show: boolean) => void;

  // Custom status modal
  showCustomStatus: boolean;
  setShowCustomStatus: (show: boolean) => void;

  // Emoji picker
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;

  // Turbo modal
  showTurboModal: boolean;
  setShowTurboModal: (show: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', opts?: Partial<Pick<ToastMessage, 'actionLabel' | 'onAction' | 'duration'>>) => set((state) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast: ToastMessage = {
      id,
      message,
      type,
      actionLabel: opts?.actionLabel,
      onAction: opts?.onAction,
      duration: opts?.duration ?? 3000,
    };
    // Keep max 4 toasts; oldest get pushed out
    const newToasts = [...state.toasts, newToast].slice(-4);
    return { toasts: newToasts };
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  isCreateServerOpen: false,
  setCreateServerOpen: (open) => set({ isCreateServerOpen: open }),

  isCreateChannelOpen: false,
  setCreateChannelOpen: (open) => set({ isCreateChannelOpen: open }),

  profilePopupUser: null,
  profilePopupPosition: null,
  openProfilePopup: (user, position) => set({ profilePopupUser: user, profilePopupPosition: position }),
  closeProfilePopup: () => set({ profilePopupUser: null, profilePopupPosition: null }),

  threadMessageId: null,
  setThreadMessageId: (id) => set({ threadMessageId: id }),

  showPinnedPanel: false,
  setShowPinnedPanel: (show) => set({ showPinnedPanel: show }),

  showSearchPanel: false,
  setShowSearchPanel: (show) => set({ showSearchPanel: show }),

  inviteModalServerId: null,
  setInviteModalOpen: (serverId) => set({ inviteModalServerId: serverId }),

  showDiscover: false,
  setShowDiscover: (show) => set({ showDiscover: show }),

  showCustomStatus: false,
  setShowCustomStatus: (show) => set({ showCustomStatus: show }),

  showEmojiPicker: false,
  setShowEmojiPicker: (show) => set({ showEmojiPicker: show }),

  showTurboModal: false,
  setShowTurboModal: (show) => set({ showTurboModal: show }),
}));
