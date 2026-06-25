import React from 'react';
import { AppWindow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import { useUiStore } from '../../stores/uiStore';

const apps = [
  ['Hub Login', '#2775ff'],
  ['AppKit', '#111111'],
  ['Zealy', '#7a33ff'],
  ['Whop Bot', '#ff8a1c'],
  ['Gradient Network', '#f5f5f5'],
  ['Richup.io', '#7a5cff'],
  ['Double Counter', '#111111'],
  ['Gleam.io', '#ffd742'],
  ['FP Roles Manager', '#111111'],
];

const AuthorizedApps: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  return (
    <main className="settings-page">
      <BackHeader title="AUTHORIZED APPS" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <section>
          <SectionHeader title="APPLICATIONS" />
          <p className="settings-copy">Here are all the apps doing cool things to make your VOX experience better. You can remove them at any time.</p>
        </section>

        <section>
          <SectionHeader title="APPS" />
          <div className="authorized-app-list">
            {apps.map(([name, color]) => (
              <button key={name} type="button" onClick={() => addToast(`${name} opened`, 'info')}>
                <span style={{ backgroundColor: color, color: color === '#f5f5f5' || color === '#ffd742' ? '#111' : '#fff' }}>
                  <AppWindow size={18} />
                </span>
                <strong>{name}</strong>
                <b>-&gt;</b>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthorizedApps;
