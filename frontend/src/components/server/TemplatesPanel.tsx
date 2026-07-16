import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, Plus, Server } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import {
  listTemplates,
  listMyTemplates,
  saveServerTemplate,
  createFromTemplate,
  deleteTemplate,
  type ServerTemplate,
} from '../../api/templates';

const TemplatesPanel: React.FC<{ serverId: string }> = ({ serverId }) => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [templates, setTemplates] = useState<ServerTemplate[]>([]);
  const [mine, setMine] = useState<ServerTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ServerTemplate | null>(null);

  const load = async () => {
    try {
      const [pub, my] = await Promise.all([listTemplates(), listMyTemplates()]);
      setTemplates(pub.templates);
      setMine(my.templates);
    } catch {
      addToast('Could not load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { addToast('Template name is required', 'error'); return; }
    setSaving(true);
    try {
      await saveServerTemplate(serverId, { name: name.trim(), description: description.trim() || undefined });
      addToast('Server saved as template', 'success');
      setName(''); setDescription('');
      await load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to save template', 'error');
    } finally { setSaving(false); }
  };

  const handleCreate = async (t: ServerTemplate) => {
    try {
      const res = await createFromTemplate({ templateId: t.id });
      addToast(`Created server "${res.server.name}"`, 'success');
      navigate(`/channels/${res.server.id}/${res.server.channels?.[0]?.id || ''}`);
    } catch (e: any) {
      addToast(e?.message || 'Failed to create server', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget.id);
      setMine((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      addToast('Template deleted', 'success');
    } catch {
      addToast('Failed to delete template', 'error');
    } finally { setDeleteTarget(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <h3 style={{ color: 'var(--ghost-white)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>
          SAVE THIS SERVER AS TEMPLATE
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="field-label">Name</label>
            <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Community Template" />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label className="field-label">Description</label>
            <input className="text-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <button type="button" className="angular-button primary" onClick={handleSave} disabled={saving} style={{ height: 36 }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Only the server owner can create templates. Templates snapshot channels, categories, and roles.
        </p>
      </section>

      <section>
        <h3 style={{ color: 'var(--ghost-white)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>
          MY TEMPLATES
        </h3>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : mine.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>You haven't saved any templates.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mine.map((t) => (
              <div key={t.id} className="vox-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <strong>{t.name}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t.channelCount} channels · {t.roleCount} roles · used {t.uses}×
                  </div>
                </div>
                <button type="button" className="angular-button danger" onClick={() => setDeleteTarget(t)} aria-label="Delete"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ color: 'var(--ghost-white)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>
          BROWSE TEMPLATES
        </h3>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : templates.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>No templates available yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map((t) => (
              <div key={t.id} className="vox-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Server size={20} style={{ color: 'var(--ash)' }} />
                <div style={{ flex: 1 }}>
                  <strong>{t.name}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    by {t.creator?.displayName || t.creator?.username || 'unknown'} · {t.channelCount} channels · used {t.uses}×
                  </div>
                </div>
                <button type="button" className="angular-button" onClick={() => handleCreate(t)} style={{ height: 32 }}>
                  <Plus size={16} /> Use
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2>DELETE TEMPLATE</h2>
            <p className="settings-copy">Delete "{deleteTarget.name}"? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="angular-button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="angular-button danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPanel;
