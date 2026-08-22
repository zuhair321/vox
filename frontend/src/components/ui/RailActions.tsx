import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Bell } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useProfileStore } from '../../stores/profileStore';
import { API_BASE } from '../../api/client';

function resolveMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

/**
 * Rail Actions — fills the empty right side of the top server rail with
 * real functionality: search (quick switcher), invite, notification bell
 * with unread badge, and the current operative's avatar.
 */
const RailActions: React.FC = () => {
  const navigate = useNavigate();
  const ui = useUiStore();
  const { selectedServer } = useServerStore();
  const { unreadCount, toggle } = useNotificationStore();
  const profile = useProfileStore();
  const avatarUrl = resolveMediaUrl(profile.avatarUrl);

  const openSearch = () => {
    // The quick switcher lives in AppLayout's local state; Ctrl+K is the
    // registered shortcut. Fire it the same way the keyboard hook does.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  };

  return (
    <div className="vox-rail-actions">
      <button
        type="button"
        className="vox-rail-action"
        onClick={openSearch}
        title="Search (Ctrl+K)"
        aria-label="Search"
      >
        <Search size={15} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className="vox-rail-action"
        onClick={() => ui.setInviteModalOpen(selectedServer?.id ?? null)}
        title="Invite operatives"
        aria-label="Invite"
        disabled={!selectedServer}
        style={selectedServer ? undefined : { opacity: 0.35, cursor: 'not-allowed' }}
      >
        <UserPlus size={15} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className="vox-rail-action"
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={15} strokeWidth={1.5} />
        {unreadCount > 0 && <span className="vox-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      <button
        type="button"
        className="vox-rail-avatar"
        onClick={() => navigate('/profile')}
        title="Your profile"
        aria-label="Your profile"
      >
        {avatarUrl ? <img src={avatarUrl} alt="" /> : (profile.displayName || 'O').slice(0, 1).toUpperCase()}
      </button>
    </div>
  );
};

export default RailActions;
