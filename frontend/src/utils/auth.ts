import { API_BASE } from '../api/client';
import { useSocketStore } from '../stores/socketStore';
import { useProfileStore } from '../stores/profileStore';
import { useFriendStore } from '../stores/friendStore';
import { useMessageStore } from '../stores/messageStore';
import { useDMStore } from '../stores/dmStore';
import { useServerStore } from '../stores/serverStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUiStore } from '../stores/uiStore';

// localStorage keys tied to a user's session. Cleared on logout so the next
// login starts clean. Cosmetic prefs (theme, settings) are intentionally kept.
const SESSION_KEYS = [
  'vox_token',
  'vox_refresh_token',
  'vox_user',
  'vox_notifications',
  'vox_onboarding_done',
];

/**
 * Fully tear down the current session and send the user to /login.
 *
 * This is the single source of truth for logout — used by the Settings
 * "LOG OUT" button and the api() 401 handler. It:
 *   1. Best-effort revokes the refresh token server-side (POST /api/auth/logout).
 *   2. Disconnects the realtime socket so no further events mutate stores.
 *   3. Resets every user-scoped Zustand store to a clean state.
 *   4. Wipes session-scoped localStorage keys.
 *   5. Hard-redirects to /login so the app boots fresh (no stale memory).
 */
export function logout() {
  // 1. Revoke the refresh token. Best-effort: never block the redirect on this,
  // and never throw — the access token is short-lived (15m) so even a failed
  // revoke is not a security hole.
  const refreshToken = localStorage.getItem('vox_refresh_token');
  if (refreshToken) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: ctrl.signal,
        keepalive: true,
      }).finally(() => clearTimeout(timeout));
    } catch {
      // Network/abort failure — proceed with local teardown regardless.
    }
  }

  // 2. Drop the realtime connection before clearing stores so any in-flight
  // socket handlers don't write into freshly-reset state.
  try {
    useSocketStore.getState().disconnect();
  } catch {
    // Socket never connected — nothing to tear down.
  }

  // 3. Reset user-scoped stores so the prior user's data doesn't bleed into
  // the next login.
  try {
    useProfileStore.getState().reset();
    useFriendStore.getState().reset();
    useMessageStore.getState().reset();
    useDMStore.getState().reset();
    useServerStore.getState().reset();
    // clearAll() also wipes the persisted `vox_notifications` key.
    useNotificationStore.getState().clearAll();
    // Close any stray overlays/modals/panels.
    useUiStore.getState().setCreateServerOpen(false);
    useUiStore.getState().setCreateChannelOpen(false);
    useUiStore.getState().closeProfilePopup();
    useUiStore.getState().setThreadMessageId(null);
    useUiStore.getState().setShowPinnedPanel(false);
    useUiStore.getState().setShowSearchPanel(false);
    useUiStore.getState().setInviteModalOpen(null);
    useUiStore.getState().setShowDiscover(false);
    useUiStore.getState().setShowCustomStatus(false);
    useUiStore.getState().setShowEmojiPicker(false);
  } catch {
    // A store failing to reset must not block the redirect.
  }

  // 4. Wipe session-scoped localStorage. (vox_notifications is also cleared by
  // clearAll() above, but we clear it here too in case the store reset threw.)
  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
  }

  // 5. Hard redirect so the React tree re-mounts with zero stale state.
  // An SPA navigate() would keep in-memory state alive across the switch.
  window.location.href = '/login';
}
