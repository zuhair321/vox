import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { api } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';

interface ReportModalProps {
  reportedUserId?: string;
  messageId?: string;
  serverId?: string;
  reportedUsername?: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or Hate Speech' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'unsafe', label: 'Safety Concern' },
  { value: 'other', label: 'Other' },
];

const ReportModal: React.FC<ReportModalProps> = ({
  reportedUserId,
  messageId,
  serverId,
  reportedUsername,
  onClose,
}) => {
  const { addToast } = useUiStore();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Determine report type from context.
  const type = messageId ? 'message' : serverId ? 'server' : 'user';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) { addToast('Please select a reason.', 'error'); return; }

    setSubmitting(true);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ type, reason, details, reportedUserId, messageId, serverId }),
      });
      setDone(true);
      addToast('Report submitted. Thank you.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
          <Flag size={32} style={{ color: 'var(--green)', marginBottom: '12px' }} />
          <h2 id="report-title" style={{ margin: '0 0 8px' }}>Report Submitted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
            We've received your report and will review it shortly. You won't be notified of the outcome.
          </p>
          <button type="button" className="angular-button" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flag size={18} />
            <h2 id="report-title" style={{ margin: 0 }}>Report {reportedUsername ? `@${reportedUsername}` : type}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close report modal" className="icon-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Help us keep VOX safe. Reports are confidential and you'll stay anonymous.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Why are you reporting this?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {REPORT_REASONS.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    style={{ accentColor: 'var(--discord-blurple)' }}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="report-details" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Additional details <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Describe what happened and why it's a problem..."
              rows={4}
              style={{
                width: '100%',
                resize: 'vertical',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--bg-modifier-accent)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="angular-button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="angular-button danger" disabled={submitting || !reason}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
