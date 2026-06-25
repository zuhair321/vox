import React from 'react';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, body, confirmLabel, onCancel, onConfirm }) => (
  <div className="confirm-backdrop" role="dialog" aria-modal="true">
    <div className="confirm-panel">
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="confirm-actions">
        <button type="button" className="angular-button" onClick={onCancel}>CANCEL</button>
        <button type="button" className="angular-button danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
