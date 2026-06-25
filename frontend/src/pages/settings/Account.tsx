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

const Account: React.FC = () => {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const { addToast } = useUiStore();
  const [activeTab, setActiveTab] = useState<'SECURITY' | 'STANDING'>('SECURITY');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const accountRows = [
    ['Username', `@${profile.username}`],
    ['Display Name', profile.displayName],
    ['Email', 'zuhair@vox.local'],
    ['Phone', 'Not connected'],
  ];

  return (
    <main className="settings-page">
      <BackHeader title="ACCOUNT" badge="99" onBack={() => navigate(-1)} />

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
                <button key={label} type="button" onClick={() => addToast(`${label} editor opened`, 'info')}>
                  <span>{label}</span>
                  <em>{value}</em>
                  <b>-&gt;</b>
                </button>
              ))}
            </div>
          </VoxCard>

          <VoxCard className="passkey-card">
            <KeyRound size={42} />
            <div>
              <h2>FORGET YOUR PASSWORD</h2>
              <p>Add a passkey and login with a single tap.</p>
            </div>
            <button type="button" onClick={() => addToast('Passkey setup armed', 'info')}>GET STARTED</button>
          </VoxCard>

          <VoxCard>
            <SectionHeader title="HOW YOU SIGN IN" />
            <div className="settings-row-list compact">
              <SettingsRow icon={KeyRound} label="Password" onClick={() => addToast('Password editor opened', 'info')} />
              <SettingsRow icon={KeyRound} label="Security Keys" value="0 added" onClick={() => addToast('Security keys opened', 'info')} />
              <SettingsRow icon={KeyRound} label="Enable Authenticator App" onClick={() => addToast('Authenticator setup opened', 'info')} />
            </div>
          </VoxCard>

          <VoxCard>
            <SectionHeader title="ACCOUNT MANAGEMENT" />
            <div className="settings-row-list compact">
              <SettingsRow icon={Trash2} label="Disable Account" onClick={() => addToast('Disable account requires backend confirmation', 'info')} />
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

      {deleteConfirm && (
        <ConfirmDialog
          title="DELETE ACCOUNT"
          body="This is a destructive account action. VOX will not execute it without final confirmation."
          confirmLabel="DELETE"
          onCancel={() => setDeleteConfirm(false)}
          onConfirm={() => {
            setDeleteConfirm(false);
            addToast('Delete account request blocked in this local build', 'error');
          }}
        />
      )}
    </main>
  );
};

export default Account;
