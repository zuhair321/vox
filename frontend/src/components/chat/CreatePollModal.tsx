import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { createPoll } from '../../api/polls';

interface CreatePollModalProps {
  channelId: string;
  onCreated?: () => void;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({ channelId, onCreated }) => {
  const { addToast } = useUiStore();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [maxVotes, setMaxVotes] = useState(1);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validOptions = options.filter((o) => o.trim().length > 0);
    if (question.trim().length < 2) {
      addToast('Question must be at least 2 characters', 'error');
      return;
    }
    if (validOptions.length < 2) {
      addToast('At least 2 options required', 'error');
      return;
    }

    setLoading(true);
    try {
      const expiresAt = duration ? new Date(Date.now() + duration * 1000).toISOString() : undefined;
      await createPoll(channelId, question.trim(), validOptions, maxVotes, expiresAt);
      addToast('Poll created!', 'success');
      onCreated?.();
    } catch (err: any) {
      addToast(err?.message || 'Failed to create poll', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onCreated?.()}
    >
      <div
        style={{
          background: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          borderRadius: '12px',
          padding: '24px',
          width: '420px',
          maxWidth: '90vw',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              color: 'var(--ghost-white)',
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: '18px',
              margin: 0,
            }}
          >
            📊 Create Poll
          </h3>
          <button
            onClick={() => onCreated?.()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ash)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Question */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                marginBottom: '6px',
              }}
            >
              QUESTION
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              maxLength={300}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--phantom)',
                border: '1px solid var(--rim)',
                borderRadius: '6px',
                color: 'var(--ghost-white)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                marginBottom: '6px',
              }}
            >
              OPTIONS
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={100}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'var(--phantom)',
                      border: '1px solid var(--rim)',
                      borderRadius: '6px',
                      color: 'var(--ghost-white)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        border: '1px solid var(--rim)',
                        borderRadius: '6px',
                        color: 'var(--ash)',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '1px dashed var(--rim)',
                  borderRadius: '6px',
                  color: 'var(--ash)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                + Add Option
              </button>
            )}
          </div>

          {/* Max votes */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                marginBottom: '6px',
              }}
            >
              MAX VOTES PER PERSON
            </label>
            <select
              value={maxVotes}
              onChange={(e) => setMaxVotes(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--phantom)',
                border: '1px solid var(--rim)',
                borderRadius: '6px',
                color: 'var(--ghost-white)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>

          {/* Duration */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--ash)',
                fontSize: '12px',
                marginBottom: '6px',
              }}
            >
              DURATION (optional)
            </label>
            <select
              value={duration ?? ''}
              onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--phantom)',
                border: '1px solid var(--rim)',
                borderRadius: '6px',
                color: 'var(--ghost-white)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="">No expiration</option>
              <option value={300}>5 minutes</option>
              <option value={3600}>1 hour</option>
              <option value={86400}>1 day</option>
              <option value={604800}>1 week</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--chaos)',
              color: 'var(--ghost-white)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Poll'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;
