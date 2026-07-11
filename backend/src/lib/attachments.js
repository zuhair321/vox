// Shared attachment normalization used by channel messages, DMs, and socket handlers.

export const ALLOWED_ATTACHMENT_KINDS = new Set(['image', 'video', 'file']);

export function normalizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      url: String(a.url || '').slice(0, 1024),
      kind: ALLOWED_ATTACHMENT_KINDS.has(a.kind) ? a.kind : 'file',
      name: String(a.name || 'file').slice(0, 200),
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0,
      mime: String(a.mime || '').slice(0, 200),
    }))
    .filter((a) => a.url)
    .slice(0, 10);
}
