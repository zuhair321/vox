import React, { useState } from 'react';
import { Info, KeyRound, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import ConfirmDialog from '../../components/settings/ConfirmDialog';
import SectionHeader from '../../components/settings/SectionHeader';
import SettingsRow from '../../components/settings/SettingsRow';
import VoxCard from '../../components/settings/VoxCard';
import { useProfileStore } from '../../stores/profileStore';
import { useUiStore } from '../../stores/uiStore';
import { API_BASE } from '../../api/client';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const { addToast } = useUiStore();
  const [activeTab, setActiveTab] = useState<'SECURITY' | 'STANDING'>('SECURITY');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}'); } catch { return {}; }
  })();
  const email = user.email || profile.username + '@vox.local';

  const changePassword = async () => {
    if (newPw !== confirmPw) { addToast('Passwords do not match.', 'error'); return; }
    if (newPw.length < 5) { addToast('Password must be at least 5 characters.', 'error'); return; }
    const token = localStorage.getItem('vox_token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Password changed successfully.', 'success');
      setPwModal(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e: any) {
      addToast(e?.message || 'Current password is incorrect.', 'error');
    }
  };

  const deleteAccount = async () => {
    const token = localStorage.getItem('vox_token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      localStorage.removeItem('vox_token');
      localStorage.removeItem('vox_user');
      addToast('Account deleted. Redirecting...', 'info');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete account.', 'error');
    }
  };

  const accountRows = [
    ['Username', `@${profile.username || user.username || 'Unknown'}`],
    ['Display Name', profile.displayName || user.displayName || 'Unknown'],
    ['Email', email],
    ['Phone', 'Not connected'],
  ];

  return (
    <main className="settings-page">
      <BackHeader title="ACCOUNT" onBack={() => navigate(-1)} />

      <div className="settings-tabs">
        {(['SECURITY', 'STANDING'] as const).map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'SECURITY' ? (
        <div className="settings-list-stack">
          <div className="settings-info-banner">
            <Info size={18} />
            <span>Looking for blocked or ignored accounts?</span>
            <button type="button" onClick={() => navigate('/settings/social')}>Go to settings</button>
          </div>

          <VoxCard>
            <SectionHeader title="ACCOUNT INFORMATION" />
            <div className="account-info-list">
              {accountRows.map(([label, value]) => (
                <button key={label} type="button" onClick={() => addToast(`${label} editor — coming soon.`, 'info')}>
                  <span>{label}</span>
                  <em>{value}</em>
                  <b>-&gt;</b>
                </button>
              ))}
            </div>
          </VoxCard>

          <VoxCard>
            <SectionHeader title="HOW YOU SIGN IN" />
            <div className="settings-row-list compact">
              <SettingsRow icon={KeyRound} label="Password" onClick={() => setPwModal(true)} />
              <SettingsRow icon={KeyRound} label="Security Keys" value="0 added" onClick={() => addToast('Security keys — coming soon.', 'info')} />
              <SettingsRow icon={KeyRound} label="Enable Authenticator App" onClick={() => addToast('Authenticator — coming soon.', 'info')} />
            </div>
          </VoxCard>

          <VoxCard>
            <SectionHeader title="ACCOUNT MANAGEMENT" />
            <div className="settings-row-list compact">
              <SettingsRow icon={Trash2} label="Disable Account" onClick={() => addToast('Disable account — coming soon.', 'info')} />
              <SettingsRow icon={Trash2} label="Delete Account" danger onClick={() => setDeleteConfirm(true)} />
            </div>
          </VoxCard>
        </div>
      ) : (
        <VoxCard>
          <SectionHeader title="ACCOUNT STANDING" />
          <p className="settings-muted">No active strikes. Your command access is clean.</p>
        </VoxCard>
      )}

      {/* Delete Account Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="DELETE ACCOUNT"
          body="This is a destructive account action. All data will be permanently erased. VOX will not execute it without final confirmation."
          confirmLabel="DELETE"
          onCancel={() => setDeleteConfirm(false)}
          onConfirm={deleteAccount}
        />
      )}

      {/* Password Change Modal */}
      {pwModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
        }}>
          <div style={{
            background: 'var(--abyss)', border: '1px solid var(--rim)', padding: '24px', width: '360px', maxWidth: '90vw',
          }}>
            <h3 style={{ fontFamily: 'Cinzel Decorative, serif', color: 'var(--ghost-white)', marginBottom: '16px' }}>CHANGE PASSWORD</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="password" className="angular-input" placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
              <input type="password" className="angular-input" placeholder="New password (min 5)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <input type="password" className="angular-input" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="angular-button primary" style={{ flex: 1 }} onClick={changePassword}>SAVE</button>
              <button className="angular-button" style={{ background: 'var(--obsidian)', color: 'var(--ash)' }} onClick={() => { setPwModal(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Account;
