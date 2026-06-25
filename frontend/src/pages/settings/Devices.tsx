import React from 'react';
import { AlertTriangle, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import { useUiStore } from '../../stores/uiStore';

const Devices: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  return (
    <main className="settings-page">
      <BackHeader title="DEVICES" badge="99" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <p className="settings-copy">Here are all devices currently logged into your VOX account. You can log out of each individually or all other devices.</p>
        <p className="settings-copy">If you see an entry you do not recognize, log out of that device and change your VOX account password immediately.</p>

        <section>
          <SectionHeader title="CURRENT DEVICE" />
          <VoxCard className="device-card">
            <Smartphone size={25} />
            <div>
              <strong>Desktop - VOX Desktop</strong>
              <span>Local Network</span>
            </div>
          </VoxCard>
        </section>

        <section>
          <SectionHeader title="OTHER DEVICES" />
          <VoxCard className="empty-device-card">
            <AlertTriangle size={22} />
            <div>
              <strong>Some older devices may not be shown here</strong>
              <p>To log them out, please <button type="button" className="settings-link inline" onClick={() => addToast('Password page opened', 'info')}>change your password</button></p>
            </div>
          </VoxCard>
        </section>
      </div>
    </main>
  );
};

export default Devices;
