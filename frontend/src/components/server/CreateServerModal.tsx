import React, { useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { createServer } from '../../api/servers';
import { useNavigate } from 'react-router-dom';
import { validateServerName } from '../../utils/validation';

const CreateServerModal: React.FC = () => {
  const { isCreateServerOpen, setCreateServerOpen, addToast } = useUiStore();
  const { fetchServers } = useServerStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isCreateServerOpen) return null;

  const handleCreate = async () => {
    const error = validateServerName(name);
    if (error) {
      addToast(error, 'error');
      return;
    }
    setLoading(true);
    try {
      await createServer(name);
      await fetchServers();
      addToast('⚡ Realm forged. Welcome.', 'success');
      setCreateServerOpen(false);
      setName('');
    } catch (e: any) {
      addToast(e.message || 'Failed to create server', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div 
        className="angular-cut-top-right"
        style={{ 
          width: '400px', backgroundColor: 'var(--dark-matter)', border: '1px solid var(--rim)', padding: '24px', position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', backgroundColor: 'var(--chaos)', clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
        
        <h2 style={{ color: 'var(--ghost-white)', fontSize: '20px', marginBottom: '24px', textAlign: 'center' }}>CREATE YOUR REALM</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '8px' }}>REALM NAME</label>
          <input 
            className="angular-input" 
            placeholder="The Dark Council" 
            value={name} 
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '32px' }}>
          <button className="angular-button" onClick={() => setCreateServerOpen(false)}>CANCEL</button>
          <button className={`angular-button primary ${loading ? 'btn-loading' : ''}`} onClick={handleCreate} disabled={!name || loading}>
            {loading ? 'FORGING...' : 'FORGE REALM →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerModal;
