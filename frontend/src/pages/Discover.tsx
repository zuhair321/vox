import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../stores/uiStore';
import { useServerStore } from '../stores/serverStore';
import { useNavigate } from 'react-router-dom';
import { discoverServers, joinServerById, DiscoverServer } from '../api/discover';
import { API_BASE } from '../api/client';
import ServerLogo from '../components/ui/ServerLogo';

const CATEGORIES = [
  'ALL', 'GAMING', 'DARK ARTS', 'TECH', 'MUSIC',
  'ANIME', 'CREATIVE', 'CRYPTO', '18+', 'COMMUNITY',
];

const CATEGORY_MAP: Record<string, string> = {
  'DARK ARTS': 'DARK_ARTS',
  '18+': '18+',
};

const Discover: React.FC = () => {
  const { showDiscover, setShowDiscover } = useUiStore();
  const { addServer, fetchServers } = useServerStore();
  const { addToast } = useUiStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [servers, setServers] = useState<DiscoverServer[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showDiscover) return;
    let alive = true;
    setLoading(true);
    const cat = CATEGORY_MAP[category] || category;
    discoverServers(cat, search, 20)
      .then((data) => {
        if (alive) setServers(data?.servers || []);
      })
      .catch(() => {
        if (alive) setServers([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [showDiscover, category, search]);

  const handleJoin = async (server: DiscoverServer) => {
    try {
      const data = await joinServerById(server.id);
      if (!data?.alreadyMember && data?.server) {
        addServer(data.server);
        await fetchServers();
        if (data.server.channels?.[0]) {
          navigate(`/channels/${data.server.id}/${data.server.channels[0].id}`);
        }
        addToast(`⚡ Joined ${server.name}. Welcome to the void.`, 'success');
        setShowDiscover(false);
      } else {
        addToast(`Already a member of ${server.name}.`, 'info');
      }
    } catch (e: any) {
      addToast(e?.message || 'Failed to join server.', 'error');
    }
  };

  if (!showDiscover) return null;

  return (
    <AnimatePresence>
      {showDiscover && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'var(--void)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowDiscover(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              zIndex: 10,
              background: 'none',
              border: 'none',
              color: 'var(--shadow)',
              cursor: 'pointer',
              fontSize: '24px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>

          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px 24px',
              background:
                'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(216,74,90,0.06), transparent)',
            }}
          >
            <h1
              style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: '32px',
                color: 'var(--ghost-white)',
                marginBottom: '12px',
                letterSpacing: '0.08em',
              }}
            >
              DISCOVER REALMS
            </h1>
            <p style={{ color: 'var(--shadow)', fontSize: '14px' }}>
              Find your community in the void
            </p>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', padding: '0 20px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
              <input
                type="text"
                className="angular-input"
                placeholder="Search realms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--shadow)',
                }}
              >
                🔍
              </span>
            </div>
          </div>

          {/* Category filters */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '0 20px 20px',
              overflowX: 'auto',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: '0.12em',
                  background: category === cat ? 'var(--chaos)' : 'var(--phantom)',
                  color: category === cat ? '#ffffff' : 'var(--shadow)',
                  border: 'none',
                  cursor: 'pointer',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '40px',
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: '180px', width: '100%', maxWidth: '280px' }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && servers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', opacity: 0.2, marginBottom: '16px' }}>🧭</div>
              <div
                style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: '16px',
                  color: 'var(--shadow)',
                  marginBottom: '8px',
                }}
              >
                NO REALMS FOUND
              </div>
              <div style={{ fontSize: '12px', color: 'var(--shadow)', opacity: 0.7 }}>
                Try a different search or category.
              </div>
            </div>
          )}

          {/* Server grid */}
          {!loading && servers.length > 0 && (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 40px 40px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '16px',
                alignContent: 'start',
              }}
            >
              {servers.map((server) => {
                const bannerUrl = server.banner
                  ? server.banner.startsWith('http')
                    ? server.banner
                    : `${API_BASE}${server.banner}`
                  : null;
                const iconUrl = server.icon
                  ? server.icon.startsWith('http')
                    ? server.icon
                    : `${API_BASE}${server.icon}`
                  : null;

                return (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: 'var(--dark-matter)',
                      border: '1px solid var(--rim)',
                      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      padding: '16px',
                      cursor: 'default',
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--chaos)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--rim)';
                    }}
                  >
                    {/* Banner */}
                    {bannerUrl && (
                      <div
                        style={{
                          width: '100%',
                          height: '80px',
                          overflow: 'hidden',
                          marginBottom: '12px',
                          background: 'var(--obsidian)',
                        }}
                      >
                        <img
                          src={bannerUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}

                    {/* Icon + Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <ServerLogo
                        src={iconUrl}
                        name={server.name}
                        size={48}
                        style={{
                          background: bannerUrl ? 'transparent' : 'linear-gradient(135deg, #3b0a12, #0f0f13)',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Cinzel Decorative', serif",
                            fontSize: '14px',
                            color: 'var(--ghost-white)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {server.name}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            fontFamily: "'Creepster', cursive",
                            color: 'var(--void-purple)',
                            background: 'rgba(59,10,18,0.3)',
                            display: 'inline-block',
                            padding: '1px 6px',
                            marginTop: '2px',
                          }}
                        >
                          {server.category}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {server.description && (
                      <div
                        style={{
                          color: 'var(--shadow)',
                          fontSize: '12px',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          marginBottom: '12px',
                        }}
                      >
                        {server.description}
                      </div>
                    )}

                    {/* Members */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--ash)' }}>
                        👥 {server.memberCount.toLocaleString()} members
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--toxic)' }}>
                        🟢 {server.online} online
                      </span>
                    </div>

                    {/* Join button */}
                    <button
                      type="button"
                      className="angular-button"
                      disabled={server.joined}
                      onClick={() => handleJoin(server)}
                      style={{
                        width: '100%',
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '12px',
                        letterSpacing: '0.1em',
                        ...(server.joined
                          ? { opacity: 0.5, cursor: 'not-allowed' }
                          : {}),
                      }}
                    >
                      {server.joined ? 'JOINED ✓' : 'JOIN REALM'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Discover;
