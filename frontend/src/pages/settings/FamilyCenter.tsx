import React, { useState } from 'react';
import { Eye, Lock, MessageSquare, QrCode, Shield, Users, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import { useUiStore } from '../../stores/uiStore';

const whyItems = [
  { icon: Lock, title: 'Messages Stay Private', text: 'You can see who your family is talking to while still respecting their privacy.' },
  { icon: Eye, title: 'Transparent Sharing', text: 'You and your family see the exact same information, so you are on the same page.' },
  { icon: QrCode, title: 'Easily Connect', text: 'Setup is as simple as scanning a QR code.' },
];

const visibilityItems = [
  { icon: Users, title: 'New Friends added', text: 'See new family connections.' },
  { icon: Shield, title: 'Servers joined or participated in', text: 'Understand community activity.' },
  { icon: MessageSquare, title: 'Users messaged or called', text: 'Review contact patterns.' },
  { icon: Eye, title: 'Total time in voice or video', text: 'Track communication time.' },
  { icon: WalletCards, title: 'Total purchases', text: 'See purchase totals.' },
  { icon: Shield, title: 'Reports shared by your family', text: 'Review submitted safety reports.' },
];

const FamilyCenter: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [tab, setTab] = useState<'ACTIVITY' | 'MY FAMILY'>('ACTIVITY');

  return (
    <main className="settings-page">
      <BackHeader title="FAMILY CENTER" onBack={() => navigate(-1)} />
      <div className="settings-tabs">
        {(['ACTIVITY', 'MY FAMILY'] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'ACTIVITY' ? (
        <div className="settings-list-stack">
          <VoxCard className="family-hero">
            <div className="family-silhouette"><Users size={64} /></div>
            <h2>STAY INFORMED ABOUT YOUR FAMILY'S VOX USE</h2>
            <p>We built Family Center to provide context on how your family uses VOX so you can work together on building positive online behaviors.</p>
            <button type="button" className="angular-button primary" onClick={() => addToast('Family connection flow opened', 'info')}>CONNECT WITH FAMILY</button>
          </VoxCard>

          <section>
            <SectionHeader title="WHY FAMILY CENTER?" />
            <div className="insight-list">
              {whyItems.map(({ icon: Icon, title, text }) => (
                <VoxCard key={title} className="insight-card">
                  <Icon size={20} />
                  <div><strong>{title}</strong><p>{text}</p></div>
                </VoxCard>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="WHAT CAN CONNECTED FAMILY SEE?" />
            <div className="insight-list">
              {visibilityItems.map(({ icon: Icon, title, text }) => (
                <VoxCard key={title} className="insight-card green">
                  <Icon size={20} />
                  <div><strong>{title}</strong><p>{text}</p></div>
                </VoxCard>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <VoxCard>
          <SectionHeader title="MY FAMILY" />
          <p className="settings-muted">No family links connected.</p>
        </VoxCard>
      )}
    </main>
  );
};

export default FamilyCenter;
