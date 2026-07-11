import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketStore } from '../../stores/socketStore';
import { useUiStore } from '../../stores/uiStore';
import { votePoll, endPoll, type Poll } from '../../api/polls';

interface PollProps {
  poll: Poll;
  onUpdate?: (updated: Poll) => void;
}

const Poll: React.FC<PollProps> = ({ poll, onUpdate }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useUiStore();

  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || ''; } catch { return ''; }
  })();

  const hasVoted = poll.options.some((o) => o.votes.some((v) => v.userId === currentUserId));
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  const maxPercent = Math.max(...poll.options.map((o) => o.votes.length), 1);

  const handleVote = async (optionId: string) => {
    if (poll.ended || loading) return;

    // Toggle selection for multi-vote
    if (poll.maxVotes > 1) {
      if (selected.includes(optionId)) {
        setSelected(selected.filter((id) => id !== optionId));
      } else if (selected.length < poll.maxVotes) {
        setSelected([...selected, optionId]);
      }
    } else {
      setSelected([optionId]);
    }
  };

  const submitVote = async () => {
    if (selected.length === 0 || loading) return;
    setLoading(true);
    try {
      const updated = await votePoll(poll.id, selected);
      onUpdate?.(updated);
    } catch (err: any) {
      addToast(err?.message || 'Failed to vote', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setLoading(true);
    try {
      const updated = await endPoll(poll.id);
      onUpdate?.(updated);
      addToast('Poll ended', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to end poll', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canEnd = !poll.ended && (poll.userId === currentUserId || hasVoted);

  return (
    <div
      style={{
        background: 'var(--dark-matter)',
        border: '1px solid var(--rim)',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '500px',
        marginTop: '8px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <h4
          style={{
            color: 'var(--ghost-white)',
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: '14px',
            marginBottom: '4px',
          }}
        >
          📊 {poll.question}
        </h4>
        <div style={{ fontSize: '11px', color: 'var(--ash)' }}>
          by {poll.user?.displayName || poll.user?.username || 'Unknown'}
          {poll.ended && <span style={{ color: 'var(--chaos)' }}> • Ended</span>}
          {poll.expiresAt && !poll.ended && (
            <span> • Ends {new Date(poll.expiresAt).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {poll.options.map((option) => {
          const percent = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
          const isWinner = poll.ended && option.votes.length === maxPercent;
          const userVoted = option.votes.some((v) => v.userId === currentUserId);

          return (
            <div
              key={option.id}
              onClick={() => !poll.ended && handleVote(option.id)}
              style={{
                position: 'relative',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: poll.ended ? 'default' : 'pointer',
                border: userVoted ? '2px solid var(--chaos)' : '1px solid var(--rim)',
                background: 'var(--phantom)',
              }}
            >
              {/* Progress bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  background: isWinner
                    ? 'rgba(216,74,90,0.3)'
                    : poll.ended
                    ? 'rgba(100,100,120,0.2)'
                    : userVoted
                    ? 'rgba(216,74,90,0.2)'
                    : 'rgba(100,100,120,0.15)',
                  zIndex: 0,
                }}
              />

              {/* Content */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Checkbox/radio */}
                {!poll.ended && (
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: poll.maxVotes > 1 ? '4px' : '50%',
                      border: userVoted ? '2px solid var(--chaos)' : '2px solid var(--rim)',
                      background: userVoted ? 'var(--chaos)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {userVoted && <span style={{ color: 'var(--ghost-white)', fontSize: '12px' }}>✓</span>}
                  </div>
                )}
                {poll.ended && isWinner && (
                  <span style={{ fontSize: '16px' }}>🏆</span>
                )}

                <span
                  style={{
                    flex: 1,
                    color: 'var(--ghost-white)',
                    fontSize: '13px',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  {option.text}
                </span>

                {totalVotes > 0 && (
                  <span
                    style={{
                      color: 'var(--ash)',
                      fontSize: '12px',
                      fontFamily: "'Share Tech Mono', monospace",
                    }}
                  >
                    {percent}% ({option.votes.length})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--ash)' }}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          {poll.maxVotes > 1 && ` • Pick up to ${poll.maxVotes}`}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!poll.ended && selected.length > 0 && (
            <button
              onClick={submitVote}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: 'var(--chaos)',
                color: 'var(--ghost-white)',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '...' : 'Vote'}
            </button>
          )}
          {canEnd && !poll.ended && (
            <button
              onClick={handleEnd}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: 'var(--ash)',
                border: '1px solid var(--rim)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              End
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Poll;
