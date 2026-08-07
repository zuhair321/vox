import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Camera, Check, ExternalLink, Image, Settings, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from '../components/settings/ProfileAvatar';
import ProfileAura from '../components/settings/ProfileAura';
import SectionHeader from '../components/settings/SectionHeader';
import VoxCard from '../components/settings/VoxCard';
import { uploadProfileImage, type UploadKind } from '../api/uploads';
import { API_BASE } from '../api/client';
import { useProfileStore } from '../stores/profileStore';
import { useUiStore } from '../stores/uiStore';

const ACCEPTED_MEDIA = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'];

function resolveMediaUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

interface CropState {
  kind: UploadKind;
  file: File;
  url: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  imgW: number;
  imgH: number;
}

const AVATAR_FRAME = { w: 300, h: 300 };
const BANNER_FRAME = { w: 400, h: 150 };

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const profile = useProfileStore();
  const [activeTab, setActiveTab] = useState<'MAIN' | 'WISHLIST'>('MAIN');
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('vox_user');
    if (!rawUser) return;
    try {
      profile.hydrateFromUser(JSON.parse(rawUser));
    } catch {
      // Ignore malformed local user cache.
    }
  }, []);

  // Sync bioDraft when entering edit mode
  useEffect(() => {
    if (editingBio) {
      setBioDraft(profile.bio);
      // Focus after a tick so the textarea is mounted
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [editingBio, profile.bio]);

  const handleUpload = async (kind: UploadKind, file?: File) => {
    if (!file) return;
    if (!ACCEPTED_MEDIA.includes(file.type)) {
      addToast('Use GIF, PNG, JPEG, or WebP only.', 'error');
      return;
    }

    setUploading(kind);
    try {
      const data = await uploadProfileImage(kind, file);
      const user = data.user;
      if (user?.avatarUrl) profile.setAvatarUrl(user.avatarUrl);
      if (user?.bannerUrl) profile.setBannerUrl(user.bannerUrl);
      if (user) {
        const existing = JSON.parse(localStorage.getItem('vox_user') || '{}');
        localStorage.setItem('vox_user', JSON.stringify({ ...existing, ...user }));
        profile.hydrateFromUser(user);
      }
      addToast(`${kind === 'avatar' ? 'Avatar' : 'Banner'} updated`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploading(null);
    }
  };

  const startCrop = (kind: UploadKind, file: File) => {
    if (!ACCEPTED_MEDIA.includes(file.type)) {
      addToast('Use GIF, PNG, JPEG, or WebP only.', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      const frame = kind === 'avatar' ? AVATAR_FRAME : BANNER_FRAME;
      const coverScale = Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight);
      setCrop({
        kind,
        file,
        url,
        zoom: coverScale,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        imgW: img.naturalWidth,
        imgH: img.naturalHeight,
      });
    };
    img.src = url;
  };

  const closeCrop = () => {
    if (crop) {
      URL.revokeObjectURL(crop.url);
    }
    setCrop(null);
  };

  const doCropUpload = useCallback(async () => {
    if (!crop) return;
    const frame = crop.kind === 'avatar' ? AVATAR_FRAME : BANNER_FRAME;
    const canvas = document.createElement('canvas');
    canvas.width = frame.w;
    canvas.height = frame.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      addToast('Canvas not supported', 'error');
      closeCrop();
      return;
    }

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = crop.url;
    });

    ctx.clearRect(0, 0, frame.w, frame.h);
    ctx.translate(frame.w / 2 + crop.offsetX, frame.h / 2 + crop.offsetY);
    ctx.scale(crop.zoom, crop.zoom);
    ctx.drawImage(img, -crop.imgW / 2, -crop.imgH / 2, crop.imgW, crop.imgH);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });

    if (!blob) {
      addToast('Crop failed', 'error');
      closeCrop();
      return;
    }

    const croppedFile = new File([blob], crop.file.name, { type: 'image/jpeg' });
    closeCrop();
    await handleUpload(crop.kind, croppedFile);
  }, [crop, addToast]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!crop) return;
    setCrop({ ...crop, isDragging: true, dragStartX: e.clientX, dragStartY: e.clientY });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!crop || !crop.isDragging) return;
    const dx = e.clientX - crop.dragStartX;
    const dy = e.clientY - crop.dragStartY;
    setCrop({ ...crop, offsetX: crop.offsetX + dx, offsetY: crop.offsetY + dy, dragStartX: e.clientX, dragStartY: e.clientY });
  };

  const onMouseUp = () => {
    if (!crop) return;
    setCrop({ ...crop, isDragging: false });
  };

  const saveBio = async () => {
    // Await + surface the actual error: the previous implementation fired
    // "Bio saved" synchronously and lied on every network / 4xx failure.
    // The store now reverts the optimistic edit if the API throws, so we
    // only close the editor when the server actually persisted the value.
    try {
      await profile.updateBio(bioDraft);
      setEditingBio(false);
      addToast('Bio saved', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Could not save bio. Please try again.', 'error');
    }
  };

  const cancelBio = () => {
    setBioDraft(profile.bio);
    setEditingBio(false);
  };

  const avatarUrl = resolveMediaUrl(profile.avatarUrl);
  const bannerUrl = resolveMediaUrl(profile.bannerUrl);

  const frame = crop ? (crop.kind === 'avatar' ? AVATAR_FRAME : BANNER_FRAME) : null;
  const minZoom = frame ? Math.max(frame.w / (crop?.imgW || 1), frame.h / (crop?.imgH || 1)) : 0.1;
  const maxZoom = minZoom * 3;

  return (
    <main className="settings-page profile-page">
      <header className="profile-top">
        <button type="button" className="profile-close-button" onClick={() => navigate('/friends')} aria-label="Close profile">
          <X size={22} />
        </button>
        <div className="profile-icon-row">
          <button type="button" aria-label="Quests"><Bell size={22} /></button>
          <button type="button" aria-label="Friends" onClick={() => navigate('/friends')}><Users size={22} /></button>
          <button type="button" aria-label="Settings" onClick={() => navigate('/settings')}><Settings size={22} /></button>
        </div>
      </header>

      <section className="profile-shell">
        <div className="profile-banner">
          {bannerUrl ? <img src={bannerUrl} alt="" /> : <div className="profile-banner-empty">VOX BANNER</div>}
          <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploading === 'banner'}>
            <Image size={16} />
            {uploading === 'banner' ? 'UPLOADING' : 'CHANGE BANNER'}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/gif,image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                if (file.type === 'image/gif') handleUpload('banner', file);
                else startCrop('banner', file);
              }
              event.target.value = '';
            }}
          />
        </div>

        <div className="profile-avatar-row">
          <div className="profile-avatar-edit">
            <ProfileAura auraType={profile.auraType} size={72}>
              <ProfileAvatar username={profile.username} size={72} status={profile.userStatus} src={avatarUrl} />
            </ProfileAura>
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploading === 'avatar'} aria-label="Change avatar">
              <Camera size={15} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/gif,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  if (file.type === 'image/gif') handleUpload('avatar', file);
                  else startCrop('avatar', file);
                }
                event.target.value = '';
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              value={profile.status}
              onChange={(event) => profile.updateStatus(event.target.value)}
              placeholder="+ What's your status..."
              aria-label="Status"
              className="profile-status-input"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
              {(['online', 'idle', 'dnd'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => profile.updateUserStatus(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: profile.userStatus === s ? 'var(--ghost-white)' : 'var(--shadow)',
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    transition: 'color 0.15s ease',
                  }}
                >
                  <span
                    className={`status-dot ${s}`}
                    style={{
                      width: '10px',
                      height: '10px',
                      boxShadow: profile.userStatus === s
                        ? `0 0 6px 2px ${s === 'online' ? 'rgba(143,207,155,0.5)' : s === 'idle' ? 'rgba(217,201,141,0.5)' : 'rgba(125,31,43,0.5)'}`
                        : 'none',
                      backgroundColor: s === 'online' ? '#8fcf9b' : s === 'idle' ? '#d9c98d' : '#7d1f2b',
                    }}
                  />
                  {s}
                </button>
              ))}
            </div>
            {/* Aura picker */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--shadow)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Profile Aura
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {([
                  { id: 'none',     label: '—',    color: 'transparent', border: '1px solid var(--rim)' },
                  { id: 'void',     label: 'VOID', color: 'rgba(138,43,226,0.8)',  border: 'none' },
                  { id: 'crimson',  label: 'CR',   color: 'rgba(220,20,60,0.8)',   border: 'none' },
                  { id: 'ocean',    label: 'OC',   color: 'rgba(0,105,148,0.8)',   border: 'none' },
                  { id: 'toxic',    label: 'TX',   color: 'rgba(0,255,100,0.7)',   border: 'none' },
                  { id: 'gold',     label: 'GLD',  color: 'rgba(255,200,0,0.8)',   border: 'none' },
                  { id: 'solar',    label: 'SOL',  color: 'rgba(255,80,0,0.8)',    border: 'none' },
                  { id: 'aurora',   label: 'AUR',  color: 'linear-gradient(135deg, rgba(0,255,160,0.8),rgba(180,0,255,0.6))', border: 'none' },
                ] as const).map(({ id, label, color, border }) => (
                  <button
                    key={id}
                    type="button"
                    title={id === 'none' ? 'No aura' : `Aura: ${id}`}
                    onClick={() => profile.setAuraType(id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: color,
                      border,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: id === 'none' ? 'var(--shadow)' : id === 'gold' || id === 'solar' ? '#000' : '#fff',
                      boxShadow: profile.auraType === id ? `0 0 0 2px var(--ghost-white), 0 0 8px ${id === 'none' ? 'transparent' : color}` : 'none',
                      transition: 'box-shadow 0.15s, transform 0.1s',
                      transform: profile.auraType === id ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label={id === 'none' ? 'No aura' : `${id} aura`}
                    aria-pressed={profile.auraType === id}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-identity">
          <h1>{profile.displayName} <span>v</span></h1>
          <p>@{profile.username}</p>
          <div className="profile-badges">
            {profile.badges.map((badge) => <span key={badge.id}>{badge.label}</span>)}
          </div>
        </div>

        <button type="button" className="profile-edit-button" onClick={() => {
          if (!editingBio) setEditingBio(true);
        }}>
          {editingBio ? 'EDITING...' : 'EDIT PROFILE'}
        </button>

        <div className="profile-tabs">
          {(['MAIN', 'WISHLIST'] as const).map((tab) => (
            <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'MAIN' ? (
          <div className="profile-stack">
            <VoxCard className="orbs-card">
              <span>ORBS BALANCE</span>
              <strong>0</strong>
            </VoxCard>

            <VoxCard>
              <SectionHeader title="BIO" />
              {editingBio ? (
                <div>
                  <textarea
                    ref={textareaRef}
                    value={bioDraft}
                    onChange={(event) => setBioDraft(event.target.value)}
                    className="profile-bio-editor"
                    rows={4}
                    placeholder="Write anything here..."
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button className="angular-button" onClick={cancelBio} style={{ background: 'var(--obsidian)', color: 'var(--ash)', padding: '6px 14px', fontSize: '12px' }}>
                      CANCEL
                    </button>
                    <button className="angular-button primary" onClick={saveBio} style={{ padding: '6px 14px', fontSize: '12px' }}>
                      SAVE BIO
                    </button>
                  </div>
                </div>
              ) : (
                <p className="profile-bio">{profile.bio || <em style={{ color: 'var(--shadow)' }}>No bio set. Click EDIT PROFILE to write one.</em>}</p>
              )}
              <div className="profile-divider" />
              <SectionHeader title="MEMBER SINCE" />
              <p className="profile-meta-row"><span>VOX</span>{profile.memberSince}</p>
            </VoxCard>

            <VoxCard>
              <SectionHeader title="CONNECTIONS" />
              <div className="connection-list">
                {profile.connections.map((connection) => (
                  <button
                    type="button"
                    key={connection.id}
                    className="connection-row"
                    onClick={() => addToast(`${connection.platform} connection selected`, 'info')}
                  >
                    <span style={{ backgroundColor: connection.color }}>{connection.platform.slice(0, 1)}</span>
                    <strong>{connection.username}</strong>
                    {connection.verified && <Check size={14} />}
                    <ExternalLink size={15} />
                  </button>
                ))}
              </div>
            </VoxCard>
          </div>
        ) : (
          <VoxCard>
            <SectionHeader title="WISHLIST" />
            <p className="settings-muted">No artifacts saved yet.</p>
          </VoxCard>
        )}
      </section>

      {/* Crop Modal */}
      {crop && frame && (
        <div className="crop-backdrop" onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <div className="crop-panel">
            <h2 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative, serif', fontSize: '18px', marginBottom: '16px' }}>
              ADJUST {crop.kind.toUpperCase()}
            </h2>

            <div
              className="crop-frame"
              style={{ width: frame.w, height: frame.h, margin: '0 auto' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            >
              <img
                src={crop.url}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: crop.imgW,
                  height: crop.imgH,
                  transform: `translate(-50%, -50%) translate(${crop.offsetX}px, ${crop.offsetY}px) scale(${crop.zoom})`,
                }}
              />
            </div>

            <div className="crop-zoom">
              <span style={{ color: 'var(--ash)', fontSize: '11px', letterSpacing: '0.1em' }}>ZOOM</span>
              <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.01}
                value={crop.zoom}
                onChange={(e) => setCrop({ ...crop, zoom: parseFloat(e.target.value) })}
              />
              <span style={{ color: 'var(--ash)', fontSize: '11px', minWidth: '40px', textAlign: 'right' }}>
                {Math.round((crop.zoom / minZoom) * 100)}%
              </span>
            </div>

            <div className="crop-actions">
              <button className="angular-button" onClick={closeCrop} style={{ background: 'var(--obsidian)', color: 'var(--ash)' }}>
                CANCEL
              </button>
              <button className="angular-button primary" onClick={doCropUpload} disabled={uploading !== null}>
                {uploading !== null ? 'UPLOADING...' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Profile;
