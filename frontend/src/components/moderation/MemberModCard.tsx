import React from 'react';
import ModActionPanel from './ModActionPanel';

interface Props {
  serverId: string;
  memberId: string;
  memberName: string;
}

const MemberModCard: React.FC<Props> = ({ serverId, memberId, memberName }) => {
  return (
    <div className="vox-card" style={{ padding: '16px' }}>
      <h4 style={{ color: 'var(--ghost-white)', margin: '0 0 8px', fontSize: '14px' }}>{memberName}</h4>
      <ModActionPanel serverId={serverId} targetId={memberId} targetName={memberName} />
    </div>
  );
};

export default MemberModCard;
