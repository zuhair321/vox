import { API_BASE } from '../api/client';
import { useSocketStore } from '../stores/socketStore';
import { useProfileStore } from '../stores/profileStore';
import { useFriendStore } from '../stores/friendStore';
import { useMessageStore } from '../stores/messageStore';
import { useDMStore } from '../stores/dmStore';
import { useServerStore } from '../stores/serverStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUiStore } from '../stores/uiStore';

const SESSION_KEYS = [
  'vox_notifications',
  'vox_onboarding_done',
];

export function logout() {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: '' }),
      signal: ctrl.signal,
      keepalive: true,
      credentials: 'include',
    }).finally(() => clearTimeout(timeout));
  } catch {
    // Network/abort failure — proceed with local teardown regardless.
  }

  document.cookie = 'vox_access=; Path=/; Max-Age=0; SameSite=Lax';
  document.cookie = 'vox_refresh=; Path=/; Max-Age=0; SameSite=Lax';

  try {
    useSocketStore.getState().disconnect();
  } catch {
    // Socket never connected — nothing to tear down.
  }

  try {
    useProfileStore.getState().reset();
    useFriendStore.getState().reset();
    useMessageStore.getState().reset();
    useDMStore.getState().reset();
    useServerStore.getState().reset();
    useNotificationStore.getState().clearAll();
    useUiStore.getState().setCreateServerOpen(false);
    useUiStore.getState().setCreateChannelOpen(false);
    useUiStore.getState().closeProfilePopup();
    useUiStore.getState().setThreadMessageId(null);
    useUiStore.getState().setShowPinnedPanel(false);
    useUiStore.getState().setShowSearchPanel(false);
    useUiStore.getState().setShowInviteModal(false);
    useUiStore.getState().setShowDiscover(false);
    useUiStore.getState().setShowCustomStatus(false);
    useUiStore.getState().setShowEmojiPicker(false);
  } catch {
    // A store failing to reset must not block the redirect.
  }

  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
  }

  window.location.href = '/login';
}
