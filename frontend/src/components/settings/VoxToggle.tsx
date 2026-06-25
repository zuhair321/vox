import React from 'react';

interface VoxToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const VoxToggle: React.FC<VoxToggleProps> = ({ value, onChange }) => (
  <button
    type="button"
    className={`vox-toggle ${value ? 'is-on' : 'is-off'}`}
    aria-pressed={value}
    onClick={() => onChange(!value)}
  >
    <span />
  </button>
);

export default VoxToggle;
