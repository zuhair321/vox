import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api/client';
import { buildDmId } from '../../api/dm';
import { fetchUserBadges, type Badge } from '../../api/badges';
import { fetchUserActivity, type Activity } from '../../api/activity';
import ProfileCard from './ProfileCard';
import type { ProfileCardUser, ProfilePreset } from './ProfileCard';

/* ═══════════════════════════════════════════════════════════════
   ProfilePopup — thin wrapper around ProfileCard v2.
   Handles: positioning, outside-click dismiss, note CRUD,
   data fetching (badges, activity, notes), own-profile detection,
   and preset state.  The visual surface is entirely ProfileCard.
   ═══════════════════════════════════════════════════════════════ */

/** Current user ID from localStorage (matches authStore persistUser). */
function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('vox_user');
    if (!raw) return null;
    return JSON.parse(raw)?.id || null;
  } catch {
    return null;
  }
}

const ProfilePopup: React.FC = () => {
  const { profilePopupUser, profilePopupPosition, closeProfilePopup, addToast } = useUiStore();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activity, setActivityState] = useState<Activity | null>(null);

  // ── Own profile detection ────────────────────────────────────
  const myId = getCurrentUserId();
  const isOwn = !!myId && myId === profilePopupUser?.id;

  // ── Fetch badges + activity ──────────────────────────────────
  useEffect(() => {
    if (!profilePopupUser?.id) return;
    let cancelled = false;
    fetchUserBadges(profilePopupUser.id)
      .then((d) => { if (!cancelled) setBadges(d.badges || []); })
      .catch(() => { if (!cancelled) setBadges([]); });
    fetchUserActivity(profilePopupUser.id)
      .then((d) => { if (!cancelled) setActivityState(d.activity || null); })
      .catch(() => { if (!cancelled) setActivityState(null); });
    return () => { cancelled = true; };
  }, [profilePopupUser?.id]);

  // ── Fetch note ───────────────────────────────────────────────
  useEffect(() => {
    if (!profilePopupUser?.id) return;
    fetch(`${API_BASE}/api/users/${profilePopupUser.id}/notes`, { headers: {} })
      .then(r => r.json())
      .then(d => setNote(d.note?.text || ''))
      .catch(() => setNote(''));
    setEditingNote(false);
  }, [profilePopupUser?.id]);

  const saveNote = async (text: string) => {
    const res = await fetch(`${API_BASE}/api/users/${profilePopupUser?.id}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) { setNote(text); setEditingNote(false); addToast('Note saved.', 'success'); }
    else addToast('Failed to save note.', 'error');
  };

  // ── Outside-click dismiss ────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeProfilePopup();
      }
    };
    if (profilePopupUser) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profilePopupUser, closeProfilePopup]);

  if (!profilePopupUser || !profilePopupPosition) return null;

  // ── Resolve roles array ──────────────────────────────────────
  const roles: string[] = profilePopupUser.roles
    || (profilePopupUser.role ? [profilePopupUser.role] : ['MEMBER']);

  // ── Resolve preset ───────────────────────────────────────────
  const preset: ProfilePreset = profilePopupUser.preset || 'crimson-court';

  // ── Build card user ──────────────────────────────────────────
  const cardUser: ProfileCardUser = {
    id: profilePopupUser.id,
    username: profilePopupUser.username,
    displayName: profilePopupUser.displayName,
    avatarUrl: profilePopupUser.avatarUrl || null,
    bannerUrl: profilePopupUser.bannerUrl || null,
    bio: profilePopupUser.bio,
    status: profilePopupUser.status,
    roles,
    memberSince: profilePopupUser.memberSince,
    messageCount: profilePopupUser.messageCount,
    rank: profilePopupUser.rank,
    hasTurbo: profilePopupUser.hasTurbo,
    connections: profilePopupUser.connections,
    preset,
    customPrimary: profilePopupUser.customPrimary,
    customSecondary: profilePopupUser.customSecondary,
    badges: badges.map(b => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      description: b.description,
      color: b.color,
    })),
  };

  return (
    <AnimatePresence>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: Math.min(profilePopupPosition.x, window.innerWidth - 340),
          top: Math.min(profilePopupPosition.y, window.innerHeight - 520),
          zIndex: 1000,
        }}
      >
        <ProfileCard
          user={cardUser}
          isOwnProfile={isOwn}
          onMessage={isOwn ? undefined : () => {
            closeProfilePopup();
            try {
              const uid = getCurrentUserId();
              if (uid && profilePopupUser.id) {
                navigate(`/dm/${buildDmId(uid, profilePopupUser.id)}`);
              }
            } catch {}
          }}
          onAddOperative={isOwn ? undefined : () => {
            closeProfilePopup();
            addToast('Operative request sent.', 'info');
          }}
          onBannerClick={isOwn ? () => {
            addToast('Banner upload coming soon.', 'info');
          } : undefined}
          onAvatarClick={isOwn ? () => {
            addToast('Avatar upload coming soon.', 'info');
          } : undefined}
        />

        {/* Note section — below the card */}
        <div style={{
          background: 'var(--bg-elevated, #1c1a20)',
          borderTop: '1px solid var(--border-hairline, #2a2730)',
          padding: '8px 16px',
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
        }}>
          <div className="vox-pc-note-header">
            <span className="vox-pc-section-label" style={{ padding: 0 }}>MY NOTE</span>
            <button
              className="vox-pc-note-edit"
              onClick={() => {
                if (editingNote) {
                  const input = document.getElementById('note-input') as HTMLInputElement;
                  if (input) saveNote(input.value);
                } else {
                  setEditingNote(true);
                }
              }}
            >
              {editingNote ? 'Save' : 'Edit'}
            </button>
          </div>
          {editingNote ? (
            <input
              id="note-input"
              className="vox-pc-note-input"
              defaultValue={note}
              placeholder="Add a note about this user..."
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget as HTMLInputElement;
                  saveNote(input.value);
                }
                if (e.key === 'Escape') setEditingNote(false);
              }}
            />
          ) : (
            <p className={`vox-pc-note-text ${note ? '' : 'empty'}`}>
              {note || 'No note yet.'}
            </p>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
};

export default ProfilePopup;
