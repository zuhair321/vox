import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import ConfirmDialog from '../../components/settings/ConfirmDialog';
import { useUiStore } from '../../stores/uiStore';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKey,
  type CreatedApiKey,
  type ApiKeyScope,
} from '../../api/apikeys';

const SCOPES: ApiKeyScope[] = ['read', 'write', 'admin'];

const ApiKeysPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['read', 'write']);
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await listApiKeys();
      setKeys(data.keys);
    } catch {
      addToast('Could not load API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    setCreating(true);
    try {
      const data = await createApiKey({
        name: name.trim(),
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCreated(data.key);
      setName('');
      setScopes(['read', 'write']);
      setExpiresAt('');
      await loadKeys();
    } catch (e: any) {
      addToast(e?.message || 'Failed to create API key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeApiKey(revokeTarget.id);
      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
      addToast('API key revoked', 'success');
    } catch {
      addToast('Failed to revoke key', 'error');
    } finally {
      setRevokeTarget(null);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    addToast('Copied to clipboard', 'success');
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString() : 'Never';

  return (
    <main className="settings-page">
      <BackHeader title="API KEYS" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <p className="settings-copy">
          Create personal API keys to integrate VOX with external tools and bots.
          Treat keys like passwords — they grant full access to your account
          according to their scopes.
        </p>

        <section>
          <SectionHeader title="YOUR KEYS" />
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : keys.length === 0 ? (
            <VoxCard>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                You have no API keys yet.
              </div>
            </VoxCard>
          ) : (
            keys.map((k) => (
              <VoxCard key={k.id} className="device-card">
                <div style={{ flex: 1 }}>
                  <strong>{k.name}</strong>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      vox_{k.keyPrefix}_••••
                    </code>
                    {k.scopes.map((s) => (
                      <span key={s} style={{ fontSize: '11px', background: 'rgba(88,101,242,0.2)', color: '#8b9cff', padding: '2px 8px', borderRadius: '10px' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    <span>Last used: {formatDate(k.lastUsed)}</span>
                    <span>Expires: {formatDate(k.expiresAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="angular-button danger"
                  onClick={() => setRevokeTarget(k)}
                  aria-label="Revoke key"
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </VoxCard>
            ))
          )}
          <button
            type="button"
            className="angular-button"
            onClick={() => setShowCreate(true)}
            style={{ width: '100%', marginTop: '12px' }}
          >
            <Plus size={16} /> Create API Key
          </button>
        </section>
      </div>

      {showCreate && !created && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2><KeyRound size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />New API Key</h2>
            <label className="field-label">Name</label>
            <input
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Integration"
            />
            <label className="field-label" style={{ marginTop: 12 }}>Scopes</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SCOPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${scopes.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleScope(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="field-label" style={{ marginTop: 12 }}>Expiry (optional)</label>
            <input
              className="text-input"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="angular-button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className="angular-button primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {created && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 460 }}>
            <h2><Check size={18} style={{ verticalAlign: 'middle', marginRight: 8, color: '#3ba55d' }} />API Key Created</h2>
            <p className="settings-copy">
              Copy your key now. For security reasons you won't be able to see it again.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: 6 }}>
              <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 12 }}>{created.token}</code>
              <button type="button" className="angular-button" onClick={() => copy(created.token)}><Copy size={16} /></button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="angular-button primary" onClick={() => { setCreated(null); setShowCreate(false); }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="REVOKE API KEY"
          body={`Revoke "${revokeTarget.name}"? Any integrations using it will stop working immediately.`}
          confirmLabel="Revoke"
          onCancel={() => setRevokeTarget(null)}
          onConfirm={handleRevoke}
        />
      )}
    </main>
  );
};

export default ApiKeysPage;
