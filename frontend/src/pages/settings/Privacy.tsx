import React from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import SettingsRow from '../../components/settings/SettingsRow';
import ToggleRow from '../../components/settings/ToggleRow';
import VoxCard from '../../components/settings/VoxCard';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const { addToast } = useUiStore();

  return (
    <main className="settings-page">
      <BackHeader title="DATA & PRIVACY" badge="99" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <ToggleRow label="USE DATA TO IMPROVE VOX" description="Allows us to use and process your information to understand and improve our services." value={settings.dataImprovement} onChange={() => settings.toggle('dataImprovement')} />
        <ToggleRow label="USE DATA TO PERSONALIZE MY VOX EXPERIENCE" description="Allows us to use who you talk to and how you use VOX to personalize the app for you." value={settings.dataPersonalization} onChange={() => settings.toggle('dataPersonalization')} />
        <ToggleRow label="USE VOX ACTIVITY FOR PERSONALIZED CONTENT" description="Personalizes sponsored content using your VOX activity." value={settings.activityPersonalization} onChange={() => settings.toggle('activityPersonalization')} />
        <ToggleRow label="USE THIRD-PARTY DATA FOR PERSONALIZED CONTENT" description="Uses data from advertisers to personalize content." value={settings.thirdPartyPersonalization} onChange={() => settings.toggle('thirdPartyPersonalization')} />

        <section>
          <SectionHeader title="REQUEST YOUR DATA" />
          <div className="settings-row-list">
            <SettingsRow icon={FileText} label="Request All Of My Data" onClick={() => addToast('Data request queued', 'success')} />
          </div>
          <button type="button" className="settings-link" onClick={() => addToast('Privacy guide opened', 'info')}>Learn more</button>
        </section>

        <ToggleRow label="SHARE WHEN I UPDATE MY PROFILE" description="Allow friends to receive a push notification when you update your profile." value={settings.shareProfileUpdates} onChange={() => settings.toggle('shareProfileUpdates')} />

        <section>
          <SectionHeader title="VOICE PRIVACY" />
          <ToggleRow label="ENABLE PERSISTENT VERIFICATION CODES" description="Allow users to save your devices and mark them as verified." value={settings.voiceVerificationCodes} onChange={() => settings.toggle('voiceVerificationCodes')} />
          <p className="settings-muted">All calls on VOX are end-to-end encrypted no matter what. <button type="button" className="settings-link inline" onClick={() => addToast('Encryption guide opened', 'info')}>Learn more</button></p>
        </section>

        <section>
          <SectionHeader title="POLICIES & DISCLOSURES" />
          <div className="settings-row-list">
            <SettingsRow icon={FileText} label="Terms of Service" onClick={() => addToast('Terms opened', 'info')} />
            <SettingsRow icon={FileText} label="Privacy Policy" onClick={() => addToast('Privacy policy opened', 'info')} />
          </div>
        </section>

        <VoxCard>
          <p className="settings-muted">Privacy controls apply to this device immediately and sync when your backend session is available.</p>
        </VoxCard>
      </div>
    </main>
  );
};

export default Privacy;
