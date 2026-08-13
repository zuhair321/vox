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

  /** Unread reply count per parent message id. Maintained by socket events.
   *  Cleared when the thread panel is opened and `markThreadRead` succeeds. */
  threadUnread: Record<string, number>;
  bumpThreadUnread: (parentId: string, by?: number) => void;
  clearThreadUnread: (parentId: string) => void;
  bulkSetThreadUnread: (m: Record<string, number>) => void;

  /** Map of `${channelId}:${parentId}` → Set of userIds currently typing.
   *  The ThreadPanel watches this for typing dots. */
  threadTyping: Record<string, Record<string, number>>;
  bumpThreadTyping: (key: string, userId: string) => void;
  clearThreadTyping: (key: string, userId: string) => void;

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

  // Shortcuts modal
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
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

  threadUnread: {},
  bumpThreadUnread: (parentId, by = 1) =>
    set((s) => ({ threadUnread: { ...s.threadUnread, [parentId]: (s.threadUnread[parentId] || 0) + by } })),
  clearThreadUnread: (parentId) =>
    set((s) => {
      const next = { ...s.threadUnread };
      delete next[parentId];
      return { threadUnread: next };
    }),
  bulkSetThreadUnread: (m) => set({ threadUnread: { ...m } }),

  threadTyping: {},
  bumpThreadTyping: (key, userId) =>
    set((s) => ({
      threadTyping: {
        ...s.threadTyping,
        [key]: { ...(s.threadTyping[key] || {}), [userId]: Date.now() },
      },
    })),
  clearThreadTyping: (key, userId) =>
    set((s) => {
      const cur = s.threadTyping[key];
      if (!cur) return {};
      const next = { ...cur };
      delete next[userId];
      const merged = { ...s.threadTyping };
      if (Object.keys(next).length === 0) {
        delete merged[key];
      } else {
        merged[key] = next;
      }
      return { threadTyping: merged };
    }),

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

  showShortcuts: false,
  setShowShortcuts: (show) => set({ showShortcuts: show }),
}));
