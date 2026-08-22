import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../../api/client';
import { useVoiceStore } from '../../stores/voiceStore';

/* ═══════════════════════════════════════════════════════════════
   VOX — PROFILE CARD  (v2 — production-grade)
   Complete anatomy: banner, avatar, identity, stats, bio,
   connections, sigils, action row.  Palette presets + custom mode,
   contrast-safe text, loading skeleton, keyboard/screen-reader
   accessible, staggered entrance, particle budget.
   ═══════════════════════════════════════════════════════════════ */

// ── Preset definitions ────────────────────────────────────────────
export type ProfilePreset =
  | 'crimson-court'
  | 'ashen-requiem'
  | 'verdant-coven'
  | 'obsidian-veil'
  | 'ember-wilds'
  | 'custom';

/** Primary color for each preset — used for contrast-safe text computation. */
const PRESET_PRIMARY: Record<string, string> = {
  'crimson-court': '#a5182f',
  'ashen-requiem': '#5a5660',
  'verdant-coven': '#1f6b4a',
  'obsidian-veil': '#3a2557',
  'ember-wilds': '#b5501f',
};

export interface ProfileCardUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string;
  status?: string;
  roles?: string[];
  memberSince?: string;
  messageCount?: number;
  rank?: string;
  hasTurbo?: boolean;
  connections?: Array<{ type: string; label: string }>;
  badges?: Array<{
    id: string;
    name: string;
    icon: string;
    description?: string | null;
    color?: string | null;
  }>;
  preset?: ProfilePreset;
  customPrimary?: string;
  customSecondary?: string;
}

interface ProfileCardProps {
  user: ProfileCardUser;
  loading?: boolean;
  isOwnProfile?: boolean;
  onMessage?: () => void;
  onAddOperative?: () => void;
  onBannerClick?: () => void;
  onAvatarClick?: () => void;
  onConnectionClick?: (conn: { type: string; label: string }) => void;
}

// ── Role label mapping ────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; roleClass: string }> = {
  FOUNDER:  { label: 'FOUNDER',   roleClass: 'founder' },
  LEADER:   { label: 'LEADERSHIP', roleClass: 'founder' },
  ADMIN:    { label: 'ADMIN',     roleClass: 'admin' },
  MOD:      { label: 'MOD',       roleClass: 'mod' },
  MODERATOR:{ label: 'MOD',       roleClass: 'mod' },
  OPERATIVE:{ label: 'OPERATIVE', roleClass: '' },
  MEMBER:   { label: 'OPERATIVE', roleClass: '' },
};

// ── Connection type icons (generic, no brand logos) ───────────────
const CONN_ICONS: Record<string, string> = {
  web: '\u{1F310}',
  chat: '\u{1F4AC}',
  code: '\u{1F4BB}',
  stream: '\u{1F3AC}',
  music: '\u{1F3B5}',
  game: '\u{1F3AE}',
  social: '\u{1F465}',
  other: '\u2726',
};

// ── Relative luminance helper (WCAG) ──────────────────────────────
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Returns 'dark' or 'light' — which text color reads better on the bg. */
function contrastText(bgHex: string): string {
  const l = luminance(bgHex);
  // Use the slightly relaxed 3:1 threshold for UI elements,
  // but aim for 4.5:1+ for body text.
  return l > 0.25 ? '#1a1a1e' : '#e9e4d8';
}

// ── Ember particle generator ──────────────────────────────────────
interface Ember {
  id: number;
  left: string;
  dur: string;
  delay: string;
  drift: string;
  drift2: string;
}

function generateEmbers(count = 26): Ember[] {
  const embers: Ember[] = [];
  for (let i = 0; i < count; i++) {
    embers.push({
      id: i,
      left: `${Math.random() * 100}%`,
      dur: `${6 + Math.random() * 6}s`,
      delay: `${Math.random() * 6}s`,
      drift: `${(Math.random() - 0.5) * 30}px`,
      drift2: `${(Math.random() - 0.5) * 20}px`,
    });
  }
  return embers;
}

// ── Truncate text helper ──────────────────────────────────────────
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}

// ── Format date nicely ────────────────────────────────────────────
function formatMemberSince(date?: string): string {
  if (!date) return 'Unknown';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════════════
// SKELETON LOADING STATE
// ═══════════════════════════════════════════════════════════════
const SkeletonCard: React.FC<{ preset: ProfilePreset; customPrimary?: string; customSecondary?: string }> = ({
  preset, customPrimary, customSecondary,
}) => (
  <div
    className="vox-profile-card vox-pc-skeleton vox-pc-enter"
    data-preset={preset}
    style={{
      ...(preset === 'custom' ? {
        '--pc-custom-primary': customPrimary,
        '--pc-custom-secondary': customSecondary,
      } as React.CSSProperties : {}),
    }}
  >
    <div className="vox-pc-body">
      <div className="vox-pc-banner" />
      <div style={{ padding: '0 16px', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.12em', fontStyle: 'italic', marginTop: 8 }}>
        decrypting profile…
      </div>
      <div className="vox-pc-avatar-wrap">
        <div className="vox-pc-avatar-glow" />
        <div className="vox-pc-avatar-ring" />
        <div className="vox-pc-avatar-ring-mask" />
        <div className="vox-pc-avatar-fallback" />
        <div className="vox-pc-presence offline">
          <div className="vox-pc-presence-dot" />
        </div>
      </div>
      <div className="vox-pc-identity" style={{ paddingTop: 14 }}>
        <div className="vox-pc-shimmer vox-pc-shimmer-name" />
        <div className="vox-pc-shimmer vox-pc-shimmer-username" style={{ marginTop: 6 }} />
        <div className="vox-pc-role-pills" style={{ marginTop: 8 }}>
          <div className="vox-pc-shimmer vox-pc-shimmer-role" />
        </div>
      </div>
      <div className="vox-pc-stats">
        <div className="vox-pc-shimmer" style={{ width: 80, height: 20 }} />
        <div className="vox-pc-shimmer" style={{ width: 60, height: 20 }} />
        <div className="vox-pc-shimmer" style={{ width: 50, height: 20 }} />
      </div>
      <div className="vox-pc-shimmer vox-pc-shimmer-bio" style={{ margin: '12px 16px 0' }} />
      <div className="vox-pc-shimmer vox-pc-shimmer-bio2" style={{ margin: '4px 16px 0' }} />
      <div className="vox-pc-divider" />
      <div className="vox-pc-shimmer vox-pc-shimmer-label" />
      <div style={{ display: 'flex', gap: 8, padding: '0 16px' }}>
        <div className="vox-pc-shimmer vox-pc-shimmer-chip" />
        <div className="vox-pc-shimmer vox-pc-shimmer-chip" />
      </div>
      <div style={{ padding: '14px 16px 5px', fontSize: 8, color: 'var(--text-faint)', letterSpacing: '0.2em', fontWeight: 700 }}>
        <div className="vox-pc-shimmer" style={{ width: 50, height: 8 }} />
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
        <div className="vox-pc-shimmer vox-pc-shimmer-sigil" />
        <div className="vox-pc-shimmer vox-pc-shimmer-sigil" />
        <div className="vox-pc-shimmer vox-pc-shimmer-sigil" />
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  loading = false,
  isOwnProfile = false,
  onMessage,
  onAddOperative,
  onBannerClick,
  onAvatarClick,
  onConnectionClick,
}) => {
  const voice = useVoiceStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  const embers = useMemo(() => generateEmbers(26), []);

  // ── Intersection observer for particle budget ────────────────
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Tab visibility for animation pause ───────────────────────
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const animationsRunning = isVisible && tabVisible;

  // ── Entrance stagger ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setHasEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Resolve URLs ─────────────────────────────────────────────
  const avatarUrl = user.avatarUrl
    ? user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE}${user.avatarUrl}`
    : null;
  const bannerUrl = user.bannerUrl
    ? user.bannerUrl.startsWith('http') ? user.bannerUrl : `${API_BASE}${user.bannerUrl}`
    : null;

  // ── Status / role ────────────────────────────────────────────
  const status = (user.status || 'offline').toLowerCase();
  const roles = user.roles && user.roles.length > 0 ? user.roles : ['MEMBER'];
  const isInVoice = voice.voiceUsers.some(vu => vu.userId === user.id);

  // ── Preset + custom colors ───────────────────────────────────
  const preset = user.preset || 'crimson-court';

  // ── Contrast-safe text for role pills ────────────────────────
  const pillTextColor = contrastText(
    preset === 'custom' ? (user.customPrimary || '#a5182f') : (PRESET_PRIMARY[preset] || '#a5182f')
  );

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return <SkeletonCard preset={preset} customPrimary={user.customPrimary} customSecondary={user.customSecondary} />;
  }

  return (
    <div
      ref={cardRef}
      className={`vox-profile-card ${hasEntered ? 'vox-pc-enter' : ''}`}
      data-preset={preset}
      style={{
        ...(preset === 'custom' ? {
          '--pc-custom-primary': user.customPrimary,
          '--pc-custom-secondary': user.customSecondary,
        } as React.CSSProperties : {}),
      }}
      role="article"
      aria-label={`Profile card for ${user.displayName || user.username}`}
    >
      <div className={`vox-pc-body ${hasEntered ? 'vox-pc-stagger' : ''}`}>
        {/* ── BANNER ─────────────────────────────────────────── */}
        <div
          className="vox-pc-banner"
          onClick={isOwnProfile ? onBannerClick : undefined}
          role={isOwnProfile ? 'button' : undefined}
          tabIndex={isOwnProfile ? 0 : undefined}
          aria-label={isOwnProfile ? 'Change banner image' : undefined}
          onKeyDown={isOwnProfile ? (e) => { if (e.key === 'Enter' || e.key === ' ') onBannerClick?.(); } : undefined}
        >
          {bannerUrl && <img src={bannerUrl} alt="" className="vox-pc-banner-image" loading="lazy" />}

          {/* Embers — only render when visible + tab focused */}
          {animationsRunning && (
            <div className="vox-pc-embers">
              {embers.map(e => (
                <span
                  key={e.id}
                  className="vox-pc-ember"
                  style={{
                    left: e.left,
                    '--pc-ember-dur': e.dur,
                    '--pc-ember-delay': e.delay,
                    '--pc-ember-drift': e.drift,
                    '--pc-ember-drift2': e.drift2,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          {/* Edit affordance — own profile only */}
          {isOwnProfile && (
            <div className="vox-pc-banner-edit" tabIndex={0} aria-label="Change banner">
              &#x270E; CHANGE BANNER
            </div>
          )}
        </div>

        {/* ── AVATAR ─────────────────────────────────────────── */}
        <div
          className="vox-pc-avatar-wrap"
          onClick={isOwnProfile ? onAvatarClick : undefined}
          role={isOwnProfile ? 'button' : undefined}
          tabIndex={isOwnProfile ? 0 : undefined}
          aria-label={isOwnProfile ? 'Change avatar' : `Avatar of ${user.displayName || user.username}`}
          onKeyDown={isOwnProfile ? (e) => { if (e.key === 'Enter' || e.key === ' ') onAvatarClick?.(); } : undefined}
        >
          <div className="vox-pc-avatar-glow" />
          <div className="vox-pc-avatar-ring" />
          <div className="vox-pc-avatar-ring-mask" />

          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="vox-pc-avatar-img" loading="lazy" />
          ) : (
            <div className="vox-pc-avatar-fallback">
              {(user.username || '?').slice(0, 1).toUpperCase()}
            </div>
          )}

          {/* Presence dot */}
          <div className={`vox-pc-presence ${status}`} aria-label={`Status: ${status}`}>
            <div className="vox-pc-presence-dot" />
            {status !== 'offline' && <div className="vox-pc-presence-ping" />}
          </div>

          {/* Edit affordance — own profile only */}
          {isOwnProfile && (
            <div className="vox-pc-avatar-edit" aria-label="Change avatar">
              &#x1F4F7;
            </div>
          )}
        </div>

        {/* ── IDENTITY ROW ───────────────────────────────────── */}
        <div className="vox-pc-identity">
          <div className="vox-pc-name-row">
            <span className="vox-pc-display-name" title={user.displayName || user.username}>
              {truncate(user.displayName || user.username, 22)}
            </span>
            {user.hasTurbo && <span title="Turbo" aria-label="Turbo member">&#x26A1;</span>}
          </div>

          <div className="vox-pc-username">@{truncate(user.username, 28)}</div>

          {/* Multiple role pills — stack horizontally */}
          <div className="vox-pc-role-pills" role="list" aria-label="Roles">
            {roles.map((r) => {
              const upper = r.toUpperCase();
              const meta = ROLE_META[upper] || { label: upper, roleClass: '' };
              return (
                <span
                  key={r}
                  className={`vox-pc-role-pill ${meta.roleClass}`}
                  data-role={meta.roleClass || undefined}
                  role="listitem"
                  style={preset === 'custom' ? { color: pillTextColor } : undefined}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── STATS STRIP ────────────────────────────────────── */}
        <div className="vox-pc-stats" aria-label="Profile statistics">
          {user.memberSince && (
            <div className="vox-pc-stat">
              <span className="vox-pc-stat-value">{formatMemberSince(user.memberSince)}</span>
              <span className="vox-pc-stat-label">operative since</span>
            </div>
          )}
          {user.messageCount !== undefined && (
            <div className="vox-pc-stat">
              <span className="vox-pc-stat-value">{user.messageCount.toLocaleString()}</span>
              <span className="vox-pc-stat-label">transmissions</span>
            </div>
          )}
          {user.rank && (
            <div className="vox-pc-stat">
              <span className="vox-pc-stat-value">{user.rank}</span>
              <span className="vox-pc-stat-label">rank</span>
            </div>
          )}
        </div>

        {/* ── BIO ────────────────────────────────────────────── */}
        {user.bio ? (
          <div className="vox-pc-bio" title={user.bio}>
            {truncate(user.bio, 120)}
          </div>
        ) : (
          <div className="vox-pc-bio-empty">no transmission logged yet.</div>
        )}

        {/* ── VOICE STATUS ───────────────────────────────────── */}
        {isInVoice && (
          <div className="vox-pc-voice" aria-label="Currently in voice channel">
            <span aria-hidden="true">&#x1F50A;</span>
            <span>In Voice Channel</span>
          </div>
        )}

        <div className="vox-pc-divider" />

        {/* ── CONNECTIONS ────────────────────────────────────── */}
        {user.connections && user.connections.length > 0 ? (
          <>
            <div className="vox-pc-section-label">CONNECTIONS</div>
            <div className="vox-pc-connections" role="list" aria-label="Linked accounts">
              {user.connections.map((c, i) => (
                <span
                  key={i}
                  className="vox-pc-conn-chip"
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${c.label} — ${c.type} connection`}
                  title={c.label}
                  onClick={() => onConnectionClick?.(c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onConnectionClick?.(c); }}
                >
                  <span className="vox-pc-conn-icon" aria-hidden="true">{CONN_ICONS[c.type] || CONN_ICONS.other}</span>
                  {truncate(c.label, 16)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="vox-pc-bio-empty" style={{ padding: '10px 16px 0' }}>no channels linked.</div>
        )}

        {/* ── SIGILS ─────────────────────────────────────────── */}
        {user.badges && user.badges.length > 0 && (
          <>
            <div className="vox-pc-section-label">SIGILS</div>
            <div className="vox-pc-sigils" role="list" aria-label="Achievement sigils">
              {user.badges.map((b, i) => (
                <div
                  key={b.id}
                  className="vox-pc-sigil"
                  data-title={b.name}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${b.name}${b.description ? ` — ${b.description}` : ''}`}
                  style={{
                    '--pc-twinkle-delay': `${i * 0.8}s`,
                    '--pc-twinkle-dur': `${3.5 + (i % 3) * 0.3}s`,
                  } as React.CSSProperties}
                >
                  <div className="vox-pc-sigil-glow" />
                  {/^https?:\/\//.test(b.icon) || b.icon.startsWith('/')
                    ? <img src={b.icon} alt="" style={{ width: 20, height: 20, objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                    : <span style={{ position: 'relative', zIndex: 1 }}>{b.icon}</span>
                  }
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ACTION ROW (other profiles only) ───────────────── */}
        {!isOwnProfile && (onMessage || onAddOperative) && (
          <div className="vox-pc-actions">
            {onMessage && (
              <button className="vox-pc-btn primary" onClick={onMessage} aria-label="Send message">
                &#x1F4AC; MESSAGE
              </button>
            )}
            {onAddOperative && (
              <button className="vox-pc-btn" onClick={onAddOperative} aria-label="Add operative">
                &#x2795; ADD OPERATIVE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
