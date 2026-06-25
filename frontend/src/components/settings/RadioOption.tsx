import React from 'react';

interface RadioOptionProps {
  label: string;
  description: string;
  selected: boolean;
  onChange: () => void;
}

const RadioOption: React.FC<RadioOptionProps> = ({ label, description, selected, onChange }) => (
  <button type="button" className={`radio-option ${selected ? 'selected' : ''}`} onClick={onChange}>
    <span className="radio-mark" />
    <span>
      <strong>{label}</strong>
      <em>{description}</em>
    </span>
  </button>
);

export default RadioOption;
