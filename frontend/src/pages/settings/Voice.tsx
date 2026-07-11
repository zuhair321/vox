import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import ToggleRow from '../../components/settings/ToggleRow';
import VoxCard from '../../components/settings/VoxCard';
import { useSettingsStore } from '../../stores/settingsStore';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: string;
}

const Voice: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [inputLevel, setInputLevel] = useState(0);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devs) => {
      const list = devs
        .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${d.deviceId.slice(0, 4)}`, kind: d.kind }));
      setDevices(list);
    });
  }, []);

  // Mic test level animation
  useEffect(() => {
    let id = 0;
    if (settings.inputVolume > 0) {
      const loop = () => {
        setInputLevel(Math.random() * settings.inputVolume);
        id = window.setTimeout(loop, 200);
      };
      loop();
    }
    return () => clearTimeout(id);
  }, [settings.inputVolume]);

  const inputDevices = devices.filter((d) => d.kind === 'audioinput');
  const outputDevices = devices.filter((d) => d.kind === 'audiooutput');

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
                  value={settings.inputDevice}
                  onChange={(e) => settings.setInputDevice(e.target.value)}
                >
                  <option value="default">Default — System Microphone</option>
                  {inputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  INPUT VOLUME
                </label>
                <div className="vox-slider" style={{ marginTop: '6px' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.inputVolume}
                    onChange={(e) => settings.setInputVolume(Number(e.target.value))}
                  />
                  <div><span>0%</span><strong>{settings.inputVolume}%</strong><span>100%</span></div>
                </div>
                {/* Mic test visualizer */}
                <div style={{ marginTop: '8px', display: 'flex', gap: '2px', height: '20px', alignItems: 'flex-end' }}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${Math.min(100, Math.max(10, inputLevel * (i + 1) / 10))}%`,
                        background: i < 10 ? 'var(--toxic)' : i < 16 ? 'var(--gold)' : 'var(--blood)',
                        opacity: 0.6,
                        transition: 'height 0.1s ease',
                      }}
                    />
                  ))}
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
                  value={settings.outputDevice}
                  onChange={(e) => settings.setOutputDevice(e.target.value)}
                >
                  <option value="default">Default — System Speakers</option>
                  {outputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  OUTPUT VOLUME
                </label>
                <div className="vox-slider" style={{ marginTop: '6px' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.outputVolume}
                    onChange={(e) => settings.setOutputVolume(Number(e.target.value))}
                  />
                  <div><span>0%</span><strong>{settings.outputVolume}%</strong><span>100%</span></div>
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
                className={settings.voiceActivity ? 'btn vox-btn-chaos' : 'btn vox-btn-outline'}
                style={{ flex: 1, padding: '14px', fontSize: '13px' }}
                onClick={() => {
                  settings.toggle('voiceActivity');
                  if (!settings.voiceActivity) {
                    const s = useSettingsStore.getState();
                    s.toggle('pushToTalk'); // turn off PTT
                  }
                }}
              >
                🎙 VOICE ACTIVITY
              </button>
              <button
                className={settings.pushToTalk ? 'btn vox-btn-chaos' : 'btn vox-btn-outline'}
                style={{ flex: 1, padding: '14px', fontSize: '13px' }}
                onClick={() => {
                  settings.toggle('pushToTalk');
                  if (!settings.pushToTalk) {
                    const s = useSettingsStore.getState();
                    s.toggle('voiceActivity'); // turn off VAD
                  }
                }}
              >
                🔘 PUSH TO TALK
              </button>
            </div>
            {settings.pushToTalk && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--ash)', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>
                  PUSH TO TALK KEY
                </label>
                <input
                  className="angular-input"
                  style={{ width: '100%', marginTop: '6px', textAlign: 'center', fontFamily: "'Share Tech Mono', monospace" }}
                  value={settings.pushToTalkKey}
                  onChange={(e) => settings.setPushToTalkKey(e.target.value.toUpperCase().slice(0, 1))}
                  maxLength={1}
                  placeholder="Press a key..."
                />
              </div>
            )}
          </VoxCard>
        </section>

        <section>
          <SectionHeader title="VOICE PROCESSING" />
          <ToggleRow
            label="Echo Cancellation"
            description="Remove echo from your microphone."
            value={settings.echoCancellation}
            onChange={() => settings.toggle('echoCancellation')}
          />
          <ToggleRow
            label="Noise Suppression"
            description="Remove background noise from your microphone."
            value={settings.noiseSuppression}
            onChange={() => settings.toggle('noiseSuppression')}
          />
          <ToggleRow
            label="Automatic Gain Control"
            description="Automatically adjust your microphone volume."
            value={settings.autoGainControl}
            onChange={() => settings.toggle('autoGainControl')}
          />
        </section>
      </div>
    </main>
  );
};

export default Voice;
