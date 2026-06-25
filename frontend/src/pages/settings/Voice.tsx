import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import ToggleRow from '../../components/settings/ToggleRow';
import VoxCard from '../../components/settings/VoxCard';
import { useSettingsStore } from '../../stores/settingsStore';

const Voice: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();

  return (
    <main className="settings-page">
      <BackHeader title="VOICE" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <section>
          <SectionHeader title="INPUT" />
          <VoxCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  INPUT DEVICE
                </label>
                <select
                  className="angular-input"
                  style={{ width: '100%', marginTop: '6px', background: 'var(--obsidian)', color: 'var(--ghost-white)', border: '1px solid var(--rim)', padding: '10px 12px' }}
                  defaultValue="default"
                >
                  <option value="default">Default — System Microphone</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  INPUT VOLUME
                </label>
                <div className="vox-slider" style={{ marginTop: '6px' }}>
                  <input type="range" min={0} max={100} defaultValue={80} />
                  <div><span>0%</span><strong>80%</strong><span>100%</span></div>
                </div>
              </div>
            </div>
          </VoxCard>
        </section>

        <section>
          <SectionHeader title="OUTPUT" />
          <VoxCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  OUTPUT DEVICE
                </label>
                <select
                  className="angular-input"
                  style={{ width: '100%', marginTop: '6px', background: 'var(--obsidian)', color: 'var(--ghost-white)', border: '1px solid var(--rim)', padding: '10px 12px' }}
                  defaultValue="default"
                >
                  <option value="default">Default — System Speakers</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  OUTPUT VOLUME
                </label>
                <div className="vox-slider" style={{ marginTop: '6px' }}>
                  <input type="range" min={0} max={100} defaultValue={100} />
                  <div><span>0%</span><strong>100%</strong><span>100%</span></div>
                </div>
              </div>
            </div>
          </VoxCard>
        </section>

        <section>
          <SectionHeader title="INPUT MODE" />
          <VoxCard>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn vox-btn-chaos"
                style={{ flex: 1, padding: '14px', fontSize: '13px' }}
              >
                🎙 VOICE ACTIVITY
              </button>
              <button
                className="btn vox-btn-outline"
                style={{ flex: 1, padding: '14px', fontSize: '13px' }}
              >
                🔘 PUSH TO TALK
              </button>
            </div>
          </VoxCard>
        </section>

        <section>
          <SectionHeader title="VOICE PROCESSING" />
          <ToggleRow
            label="Echo Cancellation"
            description="Remove echo from your microphone."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Noise Suppression"
            description="Remove background noise from your microphone."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Automatic Gain Control"
            description="Automatically adjust your microphone volume."
            value={true}
            onChange={() => {}}
          />
        </section>

        <section>
          <SectionHeader title="QUALITY" />
          <VoxCard>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                AUDIO QUALITY
              </label>
              <div className="vox-slider" style={{ marginTop: '6px' }}>
                <input type="range" min={0} max={2} defaultValue={1} />
                <div><span>Low</span><strong>Medium</strong><span>High</span></div>
              </div>
            </div>
          </VoxCard>
        </section>
      </div>
    </main>
  );
};

export default Voice;
