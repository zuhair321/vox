import React from 'react';
import VoxToggle from './VoxToggle';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange }) => (
  <div className="toggle-row">
    <div>
      <strong>{label}</strong>
      {description && <p>{description}</p>}
    </div>
    <VoxToggle value={value} onChange={onChange} />
  </div>
);

export default ToggleRow;
