import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onClick: () => void;
  danger?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon: Icon, label, value, onClick, danger = false }) => (
  <button type="button" className={`settings-row ${danger ? 'danger' : ''}`} onClick={onClick}>
    <Icon size={20} />
    <span>{label}</span>
    {value && <em>{value}</em>}
    <b aria-hidden="true">-&gt;</b>
  </button>
);

export default SettingsRow;
