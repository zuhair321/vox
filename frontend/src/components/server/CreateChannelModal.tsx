import React, { useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { createChannel } from '../../api/servers';
import { validateChannelName } from '../../utils/validation';

const CreateChannelModal: React.FC = () => {
  const { isCreateChannelOpen, setCreateChannelOpen, addToast } = useUiStore();
  const { selectedServer, fetchServers } = useServerStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'TEXT'|'VOICE'>('TEXT');
  const [loading, setLoading] = useState(false);

  if (!isCreateChannelOpen || !selectedServer) return null;

  const handleCreate = async () => {
    const { error, formatted } = validateChannelName(name);
    if (error) {
      addToast(error, 'error');
      return;
    }
    setLoading(true);
    try {
      await createChannel(selectedServer.id, formatted, type);
      await fetchServers();
      addToast('⚡ Channel opened.', 'success');
      setCreateChannelOpen(false);
      setName('');
    } catch (e: any) {
      addToast(e.message || 'Failed to create channel', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div 
        className="angular-cut-top-right"
        style={{ width: '400px', backgroundColor: 'var(--dark-matter)', border: '1px solid var(--rim)', padding: '24px' }}
      >
        <h2 style={{ color: 'var(--ghost-white)', fontSize: '18px', marginBottom: '24px' }}>CREATE CHANNEL</h2>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            className={`angular-button ${type === 'TEXT' ? 'active' : ''}`}
            onClick={() => setType('TEXT')}
            style={{ borderColor: type === 'TEXT' ? 'var(--chaos)' : 'var(--rim)' }}
          >
            # TEXT
          </button>
          <button 
            className={`angular-button ${type === 'VOICE' ? 'active' : ''}`}
            onClick={() => setType('VOICE')}
            style={{ borderColor: type === 'VOICE' ? 'var(--chaos)' : 'var(--rim)' }}
          >
            🔊 VOICE
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '8px' }}>CHANNEL NAME</label>
          <input className="angular-input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button className="angular-button" onClick={() => setCreateChannelOpen(false)} disabled={loading}>CANCEL</button>
          <button className={`angular-button primary ${loading ? 'btn-loading' : ''}`} onClick={handleCreate} disabled={loading}>
            {loading ? 'FORGING...' : 'FORGE CHANNEL →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChannelModal;
