import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useServerStore } from '../stores/serverStore';
import { fetchInsights } from '../api/insights';
import type { ServerInsight } from '../api/insights';

const PERIODS = ['7d', '30d', '90d'] as const;

const ServerInsights: React.FC<{ serverId: string }> = ({ serverId }) => {
  const { selectedServer } = useServerStore();
  const [insights, setInsights] = useState<ServerInsight | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serverId || !selectedServer) return;
    let alive = true;
    setLoading(true);
    fetchInsights(selectedServer.id, period)
      .then((data: ServerInsight) => {
        if (alive) setInsights(data);
      })
      .catch(() => {
        if (alive) setInsights(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [serverId, selectedServer, period]);

  if (!selectedServer) return null;

  const stats = insights
    ? [
        { label: 'Total Members', value: insights.totalMembers, sub: `${insights.newJoins} new this period`, trend: insights.newJoins >= 0 ? 'up' : 'down' },
        { label: 'Messages Sent', value: insights.totalMessages, sub: `${insights.periodMessages} this period` },
        { label: 'Active Members', value: insights.activeMembers, sub: `${insights.totalMembers > 0 ? Math.round((insights.activeMembers / insights.totalMembers) * 100) : 0}% of total` },
        { label: 'New Joins', value: insights.newJoins, sub: `in the last ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}`, trend: insights.newJoins >= 0 ? 'up' : 'down' },
      ]
    : [];

  const maxChannelCount = insights?.channelActivity?.[0]?.count || 1;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: '24px',
            color: 'var(--ghost-white)',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          SERVER INSIGHTS
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--shadow)', fontSize: '14px' }}>{selectedServer.name}</span>
          <select
            className="angular-input"
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
            style={{ width: 'auto', height: '32px', fontSize: '12px', cursor: 'pointer' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: '100px' }} />
          ))}
        </div>
      )}

      {/* Stat cards */}
      {insights && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                style={{
                  background: 'var(--dark-matter)',
                  border: '1px solid var(--rim)',
                  borderTop: '3px solid var(--chaos)',
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cinzel Decorative', serif",
                    fontSize: '28px',
                    color: 'var(--ghost-white)',
                    marginBottom: '4px',
                  }}
                >
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--shadow)', letterSpacing: '0.05em' }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: stat.sub?.startsWith('-') ? 'var(--blood)' : 'var(--toxic)', marginTop: '4px' }}>
                  {stat.trend === 'up' && '↑ '}
                  {stat.trend === 'down' && '↓ '}
                  {stat.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Channel activity bars */}
          {insights.channelActivity.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: '16px',
                  color: 'var(--ghost-white)',
                  marginBottom: '16px',
                  letterSpacing: '0.08em',
                }}
              >
                MOST ACTIVE CHANNELS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {insights.channelActivity.map((ch: any, i: number) => {
                  const pct = (ch.count / maxChannelCount) * 100;
                  return (
                    <div key={ch.channelId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--ghost-white)', fontSize: '13px', fontFamily: "'Share Tech Mono', monospace" }}>
                          #{ch.name}
                        </span>
                        <span style={{ color: 'var(--ash)', fontSize: '12px' }}>
                          {ch.count}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: 'var(--rim)',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.1 }}
                          style={{
                            height: '100%',
                            background: 'var(--chaos)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top members */}
          {insights.topMembers.length > 0 && (
            <div>
              <h3
                style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: '16px',
                  color: 'var(--ghost-white)',
                  marginBottom: '16px',
                  letterSpacing: '0.08em',
                }}
              >
                TOP MEMBERS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {insights.topMembers.map((member: any, i: number) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                  return (
                    <div
                      key={member.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: 'var(--dark-matter)',
                        border: '1px solid var(--rim)',
                      }}
                    >
                      <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{medal}</span>
                      <span style={{ flex: 1, color: 'var(--ghost-white)', fontSize: '13px', fontFamily: "'Share Tech Mono', monospace" }}>
                        {member.username}
                      </span>
                      <span style={{ color: 'var(--ash)', fontSize: '12px' }}>
                        {member.count} messages
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ServerInsights;
