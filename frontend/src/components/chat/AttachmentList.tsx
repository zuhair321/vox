import React, { useState, useCallback } from 'react';
import { API_BASE } from '../../api/client';
import ImageLightbox from '../ui/ImageLightbox';
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
  onImageClick?: (images: { url: string; name: string }[], index: number) => void;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, onImageClick }) => {
  const [lightboxImages, setLightboxImages] = useState<{ url: string; name: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  const allImages = attachments?.filter((a) => a.kind === 'image') || [];

  const openLightbox = useCallback((index: number) => {
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
          return (
            <div
              key={`${a.url}-${i}`}
              className="attachment-image-wrap"
              style={{ display: 'block', marginTop: '6px', width: '100%', maxWidth: '100%', cursor: 'zoom-in' }}
              onClick={() => openLightbox(imgIndex)}
            >
              <img
                src={fullUrl}
                alt={a.name}
                loading="lazy"
                style={{
                  width: 'auto',
                  maxWidth: '100%',
                  maxHeight: '320px',
                  height: 'auto',
                  borderRadius: '8px',
                  display: 'block',
                  objectFit: 'contain',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>
          );
        }

        if (a.kind === 'video') {
          return (
            <video
              key={`${a.url}-${i}`}
              controls
              src={fullUrl}
              style={{
                width: 'min(480px, 100%)',
                maxWidth: '100%',
                maxHeight: '320px',
                borderRadius: '8px',
                marginTop: '6px',
                display: 'block',
                background: '#000',
              }}
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
