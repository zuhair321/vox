import React from 'react';
import { API_BASE } from '../../api/client';
import type { Attachment } from '../../types';

// Resolve a backend-relative upload URL (e.g. /uploads/...) into a full URL.
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

// Render one attachment based on its kind. Images show inline, videos get a
// native player, everything else becomes a download chip.
function AttachmentView({ attachment }: { attachment: Attachment }) {
  const fullUrl = resolveUrl(attachment.url);

  if (attachment.kind === 'image') {
    return (
      <a href={fullUrl} target="_blank" rel="noreferrer" className="attachment-image-wrap" style={{ display: 'block', marginTop: '6px' }}>
        <img
          src={fullUrl}
          alt={attachment.name}
          loading="lazy"
          style={{
            maxWidth: '320px',
            maxHeight: '320px',
            borderRadius: '8px',
            display: 'block',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
      </a>
    );
  }

  if (attachment.kind === 'video') {
    return (
      <video
        controls
        src={fullUrl}
        style={{
          maxWidth: '360px',
          maxHeight: '320px',
          borderRadius: '8px',
          marginTop: '6px',
          display: 'block',
          background: '#000',
        }}
      />
    );
  }

  // file
  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noreferrer"
      download={attachment.name}
      className="attachment-file-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '6px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: 'var(--ghost-white, #e0e6ed)',
        textDecoration: 'none',
        maxWidth: '320px',
        cursor: 'pointer',
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
          }}
        >
          {attachment.name}
        </span>
        {attachment.size ? (
          <span style={{ fontSize: '11px', opacity: 0.6 }}>{formatSize(attachment.size)}</span>
        ) : null}
      </span>
    </a>
  );
}

const AttachmentList: React.FC<{ attachments?: Attachment[] }> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {attachments.map((a, i) => (
        <AttachmentView key={`${a.url}-${i}`} attachment={a} />
      ))}
    </div>
  );
};

export default AttachmentList;
