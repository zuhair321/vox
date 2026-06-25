import React, { useEffect, useState } from 'react';
import { fetchLinkPreview, LinkPreview } from '../../api/linkPreview';

interface Props {
  url: string;
}

const LinkPreviewCard: React.FC<Props> = ({ url }) => {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLinkPreview(url)
      .then((data) => {
        if (alive) setPreview(data);
      })
      .catch(() => {
        if (alive) setPreview(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [url]);

  if (dismissed) return null;

  const handleOpen = () => {
    // Use Electron's shell.openExternal when available, else window.open.
    try {
      const ea = (window as any).electronAPI;
      if (ea?.openExternal) {
        ea.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div
        className="vox-link-preview"
        style={{ pointerEvents: 'none', minHeight: '80px', position: 'relative' }}
      >
        <div
          className="skeleton"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <div style={{ padding: '12px' }}>
          <div className="skeleton" style={{ height: '10px', width: '40%', marginBottom: '6px' }} />
          <div className="skeleton" style={{ height: '14px', width: '80%', marginBottom: '4px' }} />
          <div className="skeleton" style={{ height: '12px', width: '60%' }} />
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="vox-link-preview" style={{ position: 'relative' }} onClick={handleOpen}>
      <button
        type="button"
        className="vox-link-preview-dismiss"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        aria-label="Dismiss preview"
      >
        ✕
      </button>
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          className="vox-link-preview-image"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="vox-link-preview-content">
        {preview.site && <div className="vox-link-preview-site">{preview.site}</div>}
        {preview.title && <div className="vox-link-preview-title">{preview.title}</div>}
        {preview.description && <div className="vox-link-preview-desc">{preview.description}</div>}
        <div className="vox-link-preview-url">{preview.url}</div>
      </div>
    </div>
  );
};

export default LinkPreviewCard;
