import React, { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../../api/client';

interface LightboxProps {
  images: { url: string; name: string }[];
  startIndex: number;
  onClose: () => void;
}

function resolveUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

/**
 * ImageLightbox — a smooth, glitch-free full-screen viewer.
 *
 * Design goals:
 *  - The viewport element is stable; only a crossfading layer changes per image
 *    so navigation never triggers a jarring scale/opacity re-mount.
 *  - Neighbouring images are preloaded ahead of time so switching is instant.
 *  - A per-image loading state (skeleton + spinner) prevents blank flashes.
 *  - GIFs keep animating: each image is a plain <img> that is never re-decoded
 *    unnecessarily, and the crossfade layer is keyed by index so the same image
 *    is not remounted while navigating back and forth.
 */
const ImageLightbox: React.FC<LightboxProps> = ({ images, startIndex, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const current = images[index];
  const fullUrl = resolveUrl(current?.url);
  const isGif = /\.gif(\?|$)/i.test(fullUrl || '');
  const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(fullUrl || '');

  const goNext = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const goPrev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  // Reset per-image state whenever the displayed image changes.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [index]);

  // Preload the previous and next images so navigation feels instant.
  useEffect(() => {
    const preload = (i: number) => {
      if (!images[i]) return;
      const img = new Image();
      img.src = resolveUrl(images[i].url);
    };
    preload((index + 1) % images.length);
    preload((index - 1 + images.length) % images.length);
  }, [index, images]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer',
          zIndex: 10,
          opacity: 0.8,
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s ease, opacity 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        aria-label="Close"
      >
        ✕
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: 13,
            opacity: 0.6,
            fontFamily: "'Share Tech Mono', monospace",
          }}
        >
          {index + 1} / {images.length}
        </div>
      )}

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            fontSize: 24,
            width: 44,
            height: 44,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      {/* Image stage */}
      <div
        style={{
          position: 'relative',
          width: '90vw',
          height: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading skeleton / spinner */}
        <AnimatePresence>
          {!loaded && !failed && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid rgba(255,255,255,0.25)',
                  borderTopColor: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  animation: 'vox-spin 0.8s linear infinite',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="sync">
          {isVideo ? (
            <motion.video
              key={`video-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              src={fullUrl}
              controls
              autoPlay
              onLoadedData={() => setLoaded(true)}
              onError={() => setFailed(true)}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
                borderRadius: 4,
                display: failed ? 'none' : 'block',
                background: '#000',
              }}
            />
          ) : (
            <motion.img
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: loaded ? 1 : 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              ref={imgRef}
              src={fullUrl}
              alt={current?.name}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              draggable={false}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 4,
                display: failed ? 'none' : 'block',
                userSelect: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {failed && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              textAlign: 'center',
              fontSize: 14,
              opacity: 0.8,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
            <div>Preview unavailable. Use the download button below.</div>
            <a
              href={fullUrl}
              download={current?.name}
              style={{
                display: 'inline-block',
                marginTop: 12,
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 4,
                color: 'white',
                textDecoration: 'none',
              }}
            >
              ⬇️ Download
            </a>
          </div>
        )}
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            fontSize: 24,
            width: 44,
            height: 44,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          aria-label="Next"
        >
          ›
        </button>
      )}

      {/* Download */}
      <a
        href={fullUrl}
        download={current?.name}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          color: 'white',
          opacity: 0.7,
          fontSize: 13,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          transition: 'background 0.15s ease, opacity 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      >
        ⬇️ Download
      </a>

      {/* Filename */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          opacity: 0.7,
          fontSize: 12,
          maxWidth: 'calc(100vw - 200px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {current?.name}{isGif ? '  •  GIF' : ''}
      </div>
    </motion.div>
  );
};

export default ImageLightbox;
