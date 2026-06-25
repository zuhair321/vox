import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackHeaderProps {
  title: string;
  onBack: () => void;
  badge?: string;
}

const BackHeader: React.FC<BackHeaderProps> = ({ title, onBack, badge }) => (
  <header className="settings-back-header">
    <button type="button" onClick={onBack} aria-label="Back">
      <ArrowLeft size={22} />
      {badge && <span>{badge}</span>}
    </button>
    <h1>{title}</h1>
  </header>
);

export default BackHeader;
