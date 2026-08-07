import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';

interface Props { serverId: string; }

const CategoryManager: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const { selectedServer } = useServerStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const token = (() => { try { return localStorage.getItem('vox_token'); } catch { return null; } })();

  const fetchCategories = () => {
    fetch(`${API_BASE}/api/servers/${serverId}/categories`, { headers: {} })
      .then((r) => r.json())
      .then((data) => { setCategories(data.categories || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, [serverId]);

  const createCategory = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Category created', 'success');
      setNewName('');
      fetchCategories();
    } catch (e) {
      addToast('Failed to create category', 'error');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category? Channels will be uncategorized.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/categories/${id}`, {
        method: 'DELETE',
        headers: {}
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Category deleted', 'success');
      fetchCategories();
    } catch (e) {
      addToast('Failed to delete category', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>CATEGORIES</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category..."
          className="angular-input"
          style={{ flex: 1 }}
        />
        <button className="angular-button primary" onClick={createCategory} style={{ padding: '6px 14px', fontSize: '12px' }}>
          CREATE
        </button>
      </div>
      {categories.map((cat) => (
        <div key={cat.id} className="vox-setting-row" style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--ghost-white)' }}>{cat.name} <span style={{ color: 'var(--shadow)' }}>({cat.channels?.length || 0} channels)</span></span>
          <button className="angular-button" onClick={() => deleteCategory(cat.id)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--crimson)', color: 'white' }}>
            DELETE
          </button>
        </div>
      ))}
    </div>
  );
};

export default CategoryManager;
