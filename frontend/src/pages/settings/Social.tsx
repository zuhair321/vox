import React, { useState, useEffect } from 'react';
import { Ban, Eye, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import RadioOption from '../../components/settings/RadioOption';
import SectionHeader from '../../components/settings/SectionHeader';
import SettingsRow from '../../components/settings/SettingsRow';
import ToggleRow from '../../components/settings/ToggleRow';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { api } from '../../api/client';

const Social: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const { addToast } = useUiStore();
  const [tab, setTab] = useState<'VOX' | 'CONNECTED GAMES'>('VOX');
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    api('/api/blocks').then((data: any) => {
      if (Array.isArray(data?.blocks)) setBlockedCount(data.blocks.length);
    }).catch(() => {});
  }, []);

  return (
    <main className="settings-page">
      <BackHeader title="CONTENT & SOCIAL" onBack={() => navigate(-1)} />
      <div className="settings-tabs">
        {(['VOX', 'CONNECTED GAMES'] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'VOX' ? (
        <div className="settings-list-stack">
          <section>
            <SectionHeader title="SERVER SETTINGS" />
            <div className="settings-row-list">
              <SettingsRow icon={Shield} label="Server Defaults" onClick={() => addToast('Server defaults opened', 'info')} />
            </div>
            <ToggleRow label="DIRECT MESSAGES" description="Allow DMs from other server members." value={settings.allowDMs} onChange={() => settings.toggle('allowDMs')} />
            <ToggleRow label="MESSAGE REQUESTS" description="Filter messages from server members you may not know." value={settings.messageRequests} onChange={() => settings.toggle('messageRequests')} />
          </section>

          <section>
            <SectionHeader title="FRIEND REQUESTS" />
            <ToggleRow label="Everyone" value={settings.friendRequestsEveryone} onChange={() => settings.toggle('friendRequestsEveryone')} />
            <ToggleRow label="Friends of Friends" value={settings.friendRequestsFoF} onChange={() => settings.toggle('friendRequestsFoF')} />
            <ToggleRow label="Server Members" value={settings.friendRequestsMembers} onChange={() => settings.toggle('friendRequestsMembers')} />
          </section>

          <section>
            <SectionHeader title="ACCOUNTS YOU'VE BLOCKED OR IGNORED" />
            <div className="settings-row-list">
              <SettingsRow icon={Ban} label="Blocked Accounts" value={`${blockedCount} account${blockedCount !== 1 ? 's' : ''}`} onClick={() => navigate('/settings/social')} />
              <SettingsRow icon={Eye} label="Ignored Accounts" value="0 accounts" onClick={() => addToast('Ignored accounts opened', 'info')} />
            </div>
            <p className="settings-muted">Blocked and ignored users cannot interrupt your command channel. <button type="button" className="settings-link inline" onClick={() => addToast('Feature guide opened', 'info')}>Explore our feature guide</button></p>
          </section>

          <section>
            <SectionHeader title="FIND YOUR FRIENDS" />
            <ToggleRow label="SYNC CONTACTS" description="VOX can connect you with your friends." value={settings.syncContacts} onChange={() => settings.toggle('syncContacts')} />
          </section>

          <section>
            <SectionHeader title="DISCOVERY" />
            <ToggleRow label="Phone" description="People can add you by phone." value={settings.phoneDiscovery} onChange={() => settings.toggle('phoneDiscovery')} />
            <ToggleRow label="Email" description="People can add you by email." value={settings.emailDiscovery} onChange={() => settings.toggle('emailDiscovery')} />
          </section>

          <section>
            <SectionHeader title="DIRECT MESSAGE SPAM" />
            <RadioOption label="Filter all" description="All DMs filtered for spam." selected={settings.spamFilter === 'all'} onChange={() => settings.setSpamFilter('all')} />
            <RadioOption label="Filter from non-friends" description="Messages from non-friends are filtered." selected={settings.spamFilter === 'non-friends'} onChange={() => settings.setSpamFilter('non-friends')} />
            <RadioOption label="Do not filter" description="Messages arrive without spam filtering." selected={settings.spamFilter === 'none'} onChange={() => settings.setSpamFilter('none')} />
          </section>

          <ToggleRow label="ENABLE AGE-RESTRICTED COMMANDS" value={settings.ageRestrictedCommands} onChange={() => settings.toggle('ageRestrictedCommands')} />
          <ToggleRow label="SHARE WHEN I COME ONLINE" description="Allow friends notification when online." value={settings.shareOnlineStatus} onChange={() => settings.toggle('shareOnlineStatus')} />
        </div>
      ) : (
        <div className="settings-list-stack">
          <SectionHeader title="CONNECTED GAMES" />
          <div className="settings-row-list">
            <SettingsRow icon={Users} label="Game Presence" value="Enabled" onClick={() => addToast('Game presence opened', 'info')} />
          </div>
        </div>
      )}
    </main>
  );
};

export default Social;
