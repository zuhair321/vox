import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { createInvite, fetchServerInvites, revokeInvite } from '../../api/invites';
import type { Invite } from '../../api/invites';

const InviteModal: React.FC = () => {
  const { inviteModalServerId, setInviteModalOpen } = useUiStore();
  const { selectedServer } = useServerStore();
  const { addToast } = useUiStore();
  const [code, setCode] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState('7days');
  const [maxUses, setMaxUses] = useState(0);

  const server = selectedServer?.id === inviteModalServerId ? selectedServer : null;
  const serverName = server?.name || 'Server';

  const generateLink = () => {
    return `vox.gg/invite/${code}`;
  };

  const loadInvites = () => {
    if (!inviteModalServerId) return;
    fetchServerInvites(inviteModalServerId)
      .then((data: any) => setInvites(data?.invites || []))
      .catch(() => setInvites([]));
  };

  const handleCreate = async () => {
    if (!inviteModalServerId) return;
    setLoading(true);
    try {
      const data = await createInvite(inviteModalServerId, expiresIn, maxUses);
      setCode(data?.invite?.code || '');
      setCopied(false);
      loadInvites();
    } catch (e: any) {
      addToast(e?.message || 'Failed to create invite.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRevoke = async (inviteCode: string) => {
    try {
      await revokeInvite(inviteCode);
      setInvites((prev) => prev.filter((i) => i.code !== inviteCode));
      addToast('Invite revoked.', 'info');
    } catch (e: any) {
      addToast(e?.message || 'Failed to revoke.', 'error');
    }
  };

  useEffect(() => {
    if (inviteModalServerId) {
      setCode('');
      setCopied(false);
      handleCreate();
      loadInvites();
    }
  }, [inviteModalServerId]);

  if (!inviteModalServerId) return null;

  return (
    <AnimatePresence>
      {inviteModalServerId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
          }}
          onClick={() => setInviteModalOpen(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="angular-cut-top-right"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {/* Title */}
            <h2
              style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: '18px',
                color: 'var(--ghost-white)',
                marginBottom: '20px',
                letterSpacing: '0.1em',
              }}
            >
              INVITE TO {serverName.toUpperCase()}
            </h2>

            {/* Invite link display */}
            <div
              style={{
                background: 'var(--obsidian)',
                border: '1px solid var(--rim)',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '13px',
                  color: code ? 'var(--chaos)' : 'var(--shadow)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {code ? generateLink() : 'Generating...'}
              </span>
              {code && (
                <button
                  type="button"
                  className="angular-button"
                  onClick={handleCopy}
                  disabled={copied}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontFamily: "'Share Tech Mono', monospace",
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ COPIED' : '📋 COPY'}
                </button>
              )}
            </div>

            {/* Settings row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: 'var(--shadow)',
                    marginBottom: '6px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  LINK EXPIRES AFTER
                </label>
                <select
                  className="angular-input"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  style={{ cursor: 'pointer', height: '36px', fontSize: '12px' }}
                >
                  <option value="30min">30 minutes</option>
                  <option value="1hour">1 hour</option>
                  <option value="6hours">6 hours</option>
                  <option value="1day">1 day</option>
                  <option value="7days">7 days</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: 'var(--shadow)',
                    marginBottom: '6px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  MAX USES
                </label>
                <select
                  className="angular-input"
                  value={String(maxUses)}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  style={{ cursor: 'pointer', height: '36px', fontSize: '12px' }}
                >
                  <option value="0">No limit</option>
                  <option value="1">1</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {/* Generate new link */}
            <button
              type="button"
              className="angular-button"
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: '100%',
                marginBottom: '20px',
                fontSize: '12px',
                letterSpacing: '0.1em',
              }}
            >
              GENERATE NEW LINK
            </button>

            {/* Previous invites */}
            {invites.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--shadow)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  ACTIVE INVITES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {invites.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'var(--obsidian)',
                        border: '1px solid var(--rim)',
                        fontSize: '12px',
                        fontFamily: "'Share Tech Mono', monospace",
                      }}
                    >
                      <span style={{ flex: 1, color: 'var(--chaos)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        vox.gg/invite/{inv.code}
                      </span>
                      <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>
                        {inv.maxUses > 0 ? `${inv.uses}/${inv.maxUses}` : `${inv.uses} uses`}
                      </span>
                      {inv.expiresAt && (
                        <span style={{ color: 'var(--shadow)', fontSize: '10px' }}>
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.code)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--shadow)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0 2px',
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--blood)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--shadow)'; }}
                        title="Revoke"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InviteModal;
