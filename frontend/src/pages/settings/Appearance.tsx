import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import ToggleRow from '../../components/settings/ToggleRow';
import VoxCard from '../../components/settings/VoxCard';
import { useSettingsStore, type VoxFontSize, type VoxTheme } from '../../stores/settingsStore';

const themes: Array<{ id: VoxTheme; label: string }> = [
  { id: 'void', label: 'VOID' },
  { id: 'crimson', label: 'CRIMSON' },
  { id: 'specter', label: 'SPECTER' },
];

const fontSizes: VoxFontSize[] = ['small', 'medium', 'large'];

const Appearance: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const [chatWidth, setChatWidth] = useState(2);

  return (
    <main className="settings-page">
      <BackHeader title="APPEARANCE" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <section>
          <SectionHeader title="THEME" />
          <div className="theme-grid">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={settings.theme === theme.id ? 'selected' : ''}
                onClick={() => settings.setTheme(theme.id)}
              >
                {settings.theme === theme.id && <Check size={16} />}
                <span className={`theme-preview ${theme.id}`}>
                  <i /><i /><i />
                </span>
                <strong>{theme.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="MESSAGE DISPLAY" />
          <ToggleRow label="Compact Mode" description="Fit more messages on screen." value={settings.compactMode} onChange={() => settings.toggle('compactMode')} />
          <ToggleRow label="Show Role Colors" description="Display role colors next to usernames." value={settings.showRoleColors} onChange={() => settings.toggle('showRoleColors')} />
        </section>

        <VoxCard>
          <SectionHeader title="FONT SIZE" />
          <div className="vox-slider">
            <input
              type="range"
              min={0}
              max={2}
              value={fontSizes.indexOf(settings.fontSize)}
              onChange={(event) => settings.setFontSize(fontSizes[Number(event.target.value)])}
            />
            <div><span>Small</span><strong>{settings.fontSize}</strong><span>Large</span></div>
          </div>
        </VoxCard>

        <VoxCard>
          <SectionHeader title="CHAT WIDTH" />
          <div className="vox-slider">
            <input type="range" min={0} max={2} value={chatWidth} onChange={(event) => setChatWidth(Number(event.target.value))} />
            <div><span>Compact</span><strong>{chatWidth === 2 ? 'Full' : chatWidth === 1 ? 'Balanced' : 'Compact'}</strong><span>Full</span></div>
          </div>
        </VoxCard>
      </div>
    </main>
  );
};

export default Appearance;
