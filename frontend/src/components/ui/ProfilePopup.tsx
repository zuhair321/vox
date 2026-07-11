import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';
import { useFriendStore } from '../../stores/friendStore';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api/client';
import { useVoiceStore } from '../../stores/voiceStore';
import { buildDmId } from '../../api/dm';

const ROLE_BADGES: Record<string, { color: string; label: string }> = {
  FOUNDER: { color: '#e7edf5', label: 'FOUNDER' },
  ADMIN: { color: '#d84a5a', label: 'ADMIN' },
  MODERATOR: { color: '#d9c98d', label: 'MOD' },
  MEMBER: { color: '#8c95a3', label: 'MEMBER' },
};

const STATUS_COLORS: Record<string, string> = {
  online: '#3ba55c',
  idle: '#faa61a',
  dnd: '#ed4245',
  offline: '#747f8d',
};

const ProfilePopup: React.FC = () => {
  const { profilePopupUser, profilePopupPosition, closeProfilePopup } = useUiStore();
  const { sendRequest, blockUser } = useFriendStore();
  const voice = useVoiceStore();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

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

  const avatarUrl = profilePopupUser.avatarUrl
    ? (profilePopupUser.avatarUrl.startsWith('http') ? profilePopupUser.avatarUrl : `${API_BASE}${profilePopupUser.avatarUrl}`)
    : null;
  const status = (profilePopupUser.status || 'offline').toLowerCase();
  const role = (profilePopupUser.role || 'MEMBER').toUpperCase();
  const roleBadge = ROLE_BADGES[role] || ROLE_BADGES.MEMBER;
  const isInVoice = voice.voiceUsers.some(vu => vu.userId === profilePopupUser.id);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: Math.min(profilePopupPosition.x, window.innerWidth - 300),
          top: Math.min(profilePopupPosition.y, window.innerHeight - 400),
          width: '280px',
          backgroundColor: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Banner */}
        <div style={{
          height: '60px',
          background: profilePopupUser.bannerUrl
            ? `url(${profilePopupUser.bannerUrl.startsWith('http') ? profilePopupUser.bannerUrl : `${API_BASE}${profilePopupUser.bannerUrl}`}) center/cover`
            : `linear-gradient(135deg, ${roleBadge.color}33, var(--obsidian))`,
          position: 'relative',
        }}>
          {/* Avatar overlapping banner */}
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            left: '16px',
          }}>
            <div style={{ position: 'relative' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--dark-matter)',
                    background: 'var(--obsidian)',
                  }}
                />
              ) : (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${roleBadge.color}44, var(--obsidian))`,
                  border: '3px solid var(--dark-matter)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: roleBadge.color,
                  fontWeight: 700,
                  fontSize: '18px',
                }}>
                  {(profilePopupUser.username || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              {/* Status dot */}
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: STATUS_COLORS[status] || STATUS_COLORS.offline,
                border: '2.5px solid var(--dark-matter)',
              }} />
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div style={{ padding: '28px 16px 16px' }}>
          {/* Username */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <h3 style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--ghost-white)',
              margin: 0,
            }}>
              {profilePopupUser.username}{profilePopupUser.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}
            </h3>
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              background: `${roleBadge.color}22`,
              border: `1px solid ${roleBadge.color}44`,
              borderRadius: '4px',
              color: roleBadge.color,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}>
              {roleBadge.label}
            </span>
          </div>

          {/* Discriminator */}
          <p style={{ fontSize: '12px', color: 'var(--shadow)', margin: '0 0 12px' }}>
            @{profilePopupUser.username}
          </p>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--rim)', margin: '0 0 12px' }} />

          {/* About */}
          {profilePopupUser.bio && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--shadow)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase' }}>
                ABOUT ME
              </div>
              <p style={{ fontSize: '12px', color: 'var(--ash)', margin: 0, lineHeight: 1.4 }}>
                {profilePopupUser.bio}
              </p>
            </div>
          )}

          {/* Voice status */}
          {isInVoice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(74,194,82,0.1)',
              border: '1px solid rgba(74,194,82,0.2)',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '11px',
              color: 'var(--toxic)',
            }}>
              <span>🔊</span>
              <span>In Voice Channel</span>
            </div>
          )}

          {/* Member since */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--shadow)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase' }}>
              MEMBER SINCE
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ash)' }}>
              {profilePopupUser.memberSince ? new Date(profilePopupUser.memberSince).toLocaleDateString() : 'Unknown'}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="angular-button primary"
              style={{ flex: 1, padding: '6px', fontSize: '11px' }}
              onClick={() => {
                closeProfilePopup();
                try {
                  const myId = JSON.parse(localStorage.getItem('vox_user') || '{}').id;
                  if (myId && profilePopupUser.id) {
                    navigate(`/dm/${buildDmId(myId, profilePopupUser.id)}`);
                  }
                } catch {}
              }}
            >
              💬 MESSAGE
            </button>
            <button
              className="angular-button"
              style={{ padding: '6px', fontSize: '11px' }}
              onClick={() => {
                closeProfilePopup();
                navigate('/profile');
              }}
            >
              👤 PROFILE
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfilePopup;
