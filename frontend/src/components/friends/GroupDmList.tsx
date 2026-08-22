import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupDmStore } from '../../stores/groupDmStore';

const GroupDmList: React.FC = () => {
  const navigate = useNavigate();
  const { groupDms, fetchGroupDms, isLoading } = useGroupDmStore();
  
  useEffect(() => { fetchGroupDms(); }, []);
  
  return (
    <div style={{ padding: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--ash)', padding: '8px 8px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Group Messages — {groupDms.length}
      </div>
      {isLoading && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--shadow)' }}>Loading...</div>}
      {!isLoading && groupDms.length === 0 && (
        <div className="vox-empty-state compact" style={{ padding: '16px 8px' }}>
          <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO GROUPS</div>
          <div className="vox-empty-desc" style={{ fontSize: '10px' }}>Create a group to message multiple people.</div>
        </div>
      )}
      {groupDms.map((gdm) => {
        const names = gdm.members?.slice(0, 3).map(m => m.user?.displayName || m.user?.username).join(', ') || 'Group';
        const preview = gdm.lastMessage ? `${gdm.lastMessage.sender?.username}: ${gdm.lastMessage.content?.slice(0, 40)}` : 'No messages yet';
        return (
          <button
            key={gdm.id}
            onClick={() => navigate(`/group-dm/${gdm.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '8px 10px', border: 'none', borderRadius: '4px',
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {/* Stacked avatars */}
            <div style={{ position: 'relative', width: '34px', height: '34px', flexShrink: 0 }}>
              {gdm.members?.slice(0, 2).map((m, i) => (
                <div
                  key={m.id}
                  className="octagon"
                  style={{
                    position: 'absolute',
                    width: '22px', height: '22px',
                    left: i === 0 ? '0' : '12px',
                    top: i === 0 ? '0' : '12px',
                    background: m.user?.avatarUrl ? 'var(--obsidian)' : 'var(--chaos)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: 'var(--ghost-white)',
                    zIndex: i === 0 ? 2 : 1,
                    overflow: 'hidden',
                  }}
                >
                  {m.user?.avatarUrl ? <img src={m.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.user?.username?.slice(0, 1).toUpperCase() || '?')}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ghost-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gdm.name || names}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--shadow)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {preview}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default GroupDmList;
