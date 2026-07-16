import React, { useState } from 'react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';

interface FeedbackData {
  category: 'bug' | 'feature' | 'general' | 'performance' | 'ui';
  message: string;
  rating?: number;
  page?: string;
}

const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackData['category']>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useUiStore();

  const submit = async () => {
    if (!message.trim()) {
      addToast('Please enter your feedback', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message,
          rating: rating || undefined,
          page: window.location.hash,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit feedback');

      setSubmitted(true);
      addToast('Thank you for your feedback!', 'success');
      
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage('');
        setRating(0);
      }, 2000);
    } catch (e) {
      addToast('Failed to submit feedback', 'error');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          background: 'var(--chaos)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        💬 Feedback
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }}>
      <div style={{
        background: 'var(--abyss)',
        border: '1px solid var(--rim)',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h3 style={{
          fontFamily: "'Cinzel Decorative', serif",
          color: 'var(--ghost-white)',
          margin: '0 0 16px 0',
        }}>
          Send Feedback
        </h3>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <p style={{ color: 'var(--ghost-white)', fontSize: '16px' }}>
              Thank you for helping improve VOX!
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackData['category'])}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--obsidian)',
                  color: 'var(--ghost-white)',
                  border: '1px solid var(--rim)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="bug">🐛 Bug Report</option>
                <option value="feature">💡 Feature Request</option>
                <option value="general">💬 General Feedback</option>
                <option value="performance">⚡ Performance</option>
                <option value="ui">🎨 UI/UX</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}>
                Rating (optional)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star === rating ? 0 : star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      opacity: star <= rating ? 1 : 0.3,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}>
                Your Feedback
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--obsidian)',
                  color: 'var(--ghost-white)',
                  border: '1px solid var(--rim)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--obsidian)',
                  color: 'var(--ash)',
                  border: '1px solid var(--rim)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!message.trim()}
                style={{
                  padding: '8px 16px',
                  background: 'var(--chaos)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: message.trim() ? 1 : 0.5,
                }}
              >
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackWidget;
