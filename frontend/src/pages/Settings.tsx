/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import {
  Accessibility,
  Bell,
  Cloud,
  ClipboardList,
  Cpu,
  Globe,
  HelpCircle,
  Info,
  KeyRound,
  Laptop,
  Link,
  LogOut,
  MessageSquare,
  Mic,
  Monitor,
  Palette,
  Paperclip,
  QrCode,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/settings/ConfirmDialog';
import SectionHeader from '../components/settings/SectionHeader';
import SettingsRow from '../components/settings/SettingsRow';
import { useUiStore } from '../stores/uiStore';
import { logout } from '../utils/auth';

type SettingsItem = {
  icon: React.ComponentProps<typeof SettingsRow>['icon'];
  label: string;
  value?: string;
  path?: string;
  danger?: boolean;
  action?: 'logout';
};

const accountRows: SettingsItem[] = [
  { icon: User, label: 'Account', path: '/settings/account' },
  { icon: Users, label: 'Content & Social', path: '/settings/social' },
  { icon: Shield, label: 'Data & Privacy', path: '/settings/privacy' },
  { icon: Users, label: 'Family Center', path: '/settings/family' },
  { icon: KeyRound, label: 'Authorized Apps', path: '/settings/apps' },
  { icon: KeyRound, label: 'API Keys', path: '/settings/api-keys' },
  { icon: Laptop, label: 'Sessions', path: '/settings/sessions' },
  { icon: ShieldAlert, label: 'Login History', path: '/settings/login-history' },
  { icon: Smartphone, label: 'Devices', path: '/settings/devices' },
  { icon: Link, label: 'Connections', path: '/profile' },
  { icon: Paperclip, label: 'Clips' },
  { icon: QrCode, label: 'Scan QR Code' },
];

const appRows: SettingsItem[] = [
  { icon: Mic, label: 'Voice', value: 'Voice Activity', path: '/settings/voice' },
  { icon: Palette, label: 'Appearance', value: 'Dark', path: '/settings/appearance' },
  { icon: Accessibility, label: 'Accessibility' },
  { icon: Globe, label: 'Language', value: 'English' },
  { icon: MessageSquare, label: 'Chat', path: '/settings/chat' },
  { icon: Bell, label: 'Notifications', path: '/settings/notifications' },
  { icon: Cloud as any, label: 'Server', path: '/settings/server' },
  { icon: SettingsIcon, label: 'Advanced' },
];

const supportRows: SettingsItem[] = [
  { icon: HelpCircle, label: 'Support' },
  { icon: Info, label: 'Upload Debug Logs' },
  { icon: ClipboardList, label: 'Acknowledgements' },
];

const developerRows: SettingsItem[] = [
  { icon: Sparkles, label: "What's New" },
  { icon: Monitor, label: 'App Version', value: '0.0.0' },
  { icon: Smartphone, label: 'Device Info', value: 'Desktop' },
  { icon: Cpu, label: 'Client Info' },
];

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [query, setQuery] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  const sections = useMemo(() => [
    { title: 'ACCOUNT SETTINGS', rows: accountRows },
    { title: 'APP SETTINGS', rows: appRows },
    { title: 'SUPPORT', rows: supportRows },
    { title: "WHAT'S NEW", rows: developerRows.slice(0, 1) },
    { title: 'DANGER ZONE', rows: [{ icon: LogOut, label: 'LOG OUT', danger: true, action: 'logout' as const }] },
    { title: 'DEVELOPER', rows: developerRows.slice(1) },
  ], []);

  const filteredSections = sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => `${row.label} ${row.value || ''}`.toLowerCase().includes(query.toLowerCase())),
    }))
    .filter((section) => section.rows.length > 0);

  const handleRow = (row: SettingsItem) => {
    if (row.action === 'logout') {
      setConfirmLogout(true);
      return;
    }
    if (row.path) {
      navigate(row.path);
      return;
    }
    addToast(`${row.label} panel is sealed for now`, 'info');
  };

  return (
    <main className="settings-page">
      <header className="settings-main-header">
        <button type="button" onClick={() => navigate('/friends')} aria-label="Close settings"><X size={22} /></button>
        <h1>SETTINGS</h1>
      </header>

      <div className="settings-search">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings..." />
      </div>

      <div className="settings-list-stack">
        {filteredSections.map((section) => (
          <section key={section.title}>
            <SectionHeader title={section.title} />
            <div className="settings-row-list">
              {section.rows.map((row) => (
                <SettingsRow
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  danger={row.danger}
                  onClick={() => handleRow(row)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {confirmLogout && (
        <ConfirmDialog
          title="LOG OUT"
          body="End this VOX session and return to the login rift?"
          confirmLabel="LOG OUT"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={logout}
        />
      )}
    </main>
  );
};

export default Settings;
