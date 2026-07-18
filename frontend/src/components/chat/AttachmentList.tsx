import React, { useState, useCallback } from 'react';
import { API_BASE } from '../../api/client';
import ImageLightbox from '../ui/ImageLightbox';
import VoiceNotePlayer from './VoiceNotePlayer';
import type { Attachment } from '../../types';

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentListProps {
  attachments?: Attachment[];
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments }) => {
  // Track per-image load state so thumbnails fade in smoothly instead of popping.
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});
  const markLoaded = useCallback((i: number) => {
    setLoadedMap((m) => (m[i] ? m : { ...m, [i]: true }));
  }, []);

  // Discord-style: a small collection of image URLs for the full-screen viewer.
  const allImages = attachments?.filter((a) => a.kind === 'image') || [];
  const [lightboxImages, setLightboxImages] = useState<{ url: string; name: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  const openLightbox = useCallback((index: number, video?: Attachment) => {
    if (video) {
      setLightboxImages([{ url: resolveUrl(video.url), name: video.name || 'video' }]);
      setLightboxIndex(0);
      setShowLightbox(true);
      return;
    }
    const images = allImages.map((a) => ({ url: resolveUrl(a.url), name: a.name || 'image' }));
    setLightboxImages(images);
    setLightboxIndex(index);
    setShowLightbox(true);
  }, [allImages]);

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = resolveUrl(url);
    a.download = name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '100%', minWidth: 0 }}>
      {attachments.map((a, i) => {
        const fullUrl = resolveUrl(a.url);

        if (a.kind === 'image') {
          const imgIndex = allImages.findIndex((img) => img.url === a.url);
          const isGif = /\.gif(\?|$)/i.test(fullUrl);
          const loaded = loadedMap[i];
          return (
            <div
              key={`${a.url}-${i}`}
              className={`attachment-image-wrap${loaded ? ' loaded' : ''}`}
              style={{
                display: 'block',
                marginTop: '6px',
                width: '100%',
                maxWidth: '440px',
                cursor: 'zoom-in',
                borderRadius: '8px',
                background: loaded ? 'transparent' : 'rgba(255,255,255,0.04)',
                minHeight: loaded ? undefined : 120,
                transition: 'background 0.2s ease',
              }}
              onClick={() => openLightbox(imgIndex)}
            >
              <img
                src={fullUrl}
                alt={a.name}
                loading="lazy"
                onLoad={() => markLoaded(i)}
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  maxHeight: '350px',
                  height: 'auto',
                  borderRadius: '8px',
                  display: 'block',
                  objectFit: 'contain',
                  border: '1px solid rgba(255,255,255,0.08)',
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'none' : 'scale(0.98)',
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                  // GIFs must keep animating — never let a filter freeze them.
                  filter: 'none',
                }}
              />
              {isGif && loaded && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    fontFamily: "'Share Tech Mono', monospace",
                    color: 'var(--ghost-white)',
                    background: 'rgba(0,0,0,0.55)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    pointerEvents: 'none',
                  }}
                >
                  GIF
                </span>
              )}
            </div>
          );
        }

        if (a.kind === 'video') {
          return (
            <div
              key={`${a.url}-${i}`}
              style={{
                marginTop: '6px',
                width: '100%',
                maxWidth: '440px',
                cursor: 'zoom-in',
                borderRadius: '8px',
              }}
              onClick={() => openLightbox(-1, a)}
            >
              <video
                controls
                src={fullUrl}
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  maxHeight: '350px',
                  borderRadius: '8px',
                  display: 'block',
                  background: '#000',
                }}
              />
            </div>
          );
        }

        if (a.kind === 'audio') {
          return (
            <VoiceNotePlayer
              key={`${a.url}-${i}`}
              url={a.url}
              name={a.name}
              duration={(a as any).duration}
            />
          );
        }

        // File with download button
        return (
          <div
            key={`${a.url}-${i}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '6px',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              maxWidth: '320px',
            }}
          >
            <span style={{ fontSize: '20px' }}>📄</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  color: 'var(--ghost-white)',
                  fontSize: 13,
                }}
              >
                {a.name}
              </span>
              {a.size ? (
                <span style={{ fontSize: '11px', opacity: 0.6, color: 'var(--ash)' }}>{formatSize(a.size)}</span>
              ) : null}
            </span>
            <button
              onClick={() => handleDownload(a.url, a.name)}
              style={{
                background: 'var(--void)',
                border: '1px solid var(--rim)',
                color: 'var(--ghost-white)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: '0.05em',
              }}
            >
              ⬇️ DOWNLOAD
            </button>
          </div>
        );
      })}

      {showLightbox && (
        <ImageLightbox
          images={lightboxImages}
          startIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
};

export default AttachmentList;
