import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModActionPanel from './ModActionPanel';
import ModLogViewer from './ModLogViewer';
import RoleManager from './RoleManager';
import PermissionEditor from './PermissionEditor';
import AppealManager from './AppealManager';
import MemberModCard from './MemberModCard';
import TimeoutTimer from './TimeoutTimer';
import WarningCounter from './WarningCounter';
import CustomPowerManager from './CustomPowerManager';
import CustomPowerBadge from './CustomPowerBadge';
import ChannelPermissions from './ChannelPermissions';
import EscalationRules from './EscalationRules';
import QuarantineQueue from './QuarantineQueue';
import ModStats from './ModStats';
import AutoModDashboard from './AutoModDashboard';
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../../api/roles';
import { fetchMemberModState, type MemberModState } from '../../api/moderation';
import { useUiStore } from '../../stores/uiStore';

interface ServerMemberLike {
  userId: string;
  user?: { username?: string; displayName?: string; avatarUrl?: string };
}

interface Props {
  serverId: string;
  members?: ServerMemberLike[];
  channelId?: string;
}

// Shape expected by the RoleManager component (guide component's own interface).
interface RoleManagerRole {
  id: string;
  name: string;
  position: number;
  color: string;
  permissions: string;
}

type SubTab = 'OVERVIEW' | 'ROLES' | 'MEMBERS' | 'LOG' | 'APPEALS' | 'AUTOMOD' | 'POWERS' | 'ESCALATION' | 'QUARANTINE' | 'STATS';

const SUBTABS: { key: SubTab; label: string }[] = [
  { key: 'OVERVIEW', label: 'Overview' },
  { key: 'ROLES', label: 'Roles' },
  { key: 'MEMBERS', label: 'Member Actions' },
  { key: 'LOG', label: 'Mod Log' },
  { key: 'APPEALS', label: 'Appeals' },
  { key: 'AUTOMOD', label: 'AutoMod' },
  { key: 'POWERS', label: 'Custom Powers' },
  { key: 'ESCALATION', label: 'Escalation' },
  { key: 'QUARANTINE', label: 'Quarantine' },
  { key: 'STATS', label: 'Stats' },
];

const ModerationCenter: React.FC<Props> = ({ serverId, members = [], channelId }) => {
  const { addToast } = useUiStore();
  const [sub, setSub] = useState<SubTab>('OVERVIEW');
  const [roles, setRoles] = useState<RoleManagerRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ServerMemberLike | null>(null);
  const [memberState, setMemberState] = useState<MemberModState | null>(null);

  const loadRoles = () => {
    setRolesLoading(true);
    fetchRoles(serverId)
      .then((d) => setRoles((d.roles || []).map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        color: r.color,
        permissions: r.permissions,
      }))))
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  };

  React.useEffect(() => {
    if (sub === 'ROLES') loadRoles();
  }, [sub, serverId]);

  const onMemberPick = async (m: ServerMemberLike) => {
    setSelectedMember(m);
    try {
      const state = await fetchMemberModState(serverId, m.userId);
      setMemberState(state);
    } catch {
      setMemberState(null);
    }
  };

  const renderRoles = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <RoleManager
        roles={roles.map((r) => ({ ...r, permissions: r.permissions }))}
        onCreate={async () => {
          try {
            await createRole(serverId, { name: 'New Role', color: '#5865f2', permissions: '0' });
            addToast('Role created.', 'success');
            loadRoles();
          } catch (e: any) { addToast(e?.message || 'Failed.', 'error'); }
        }}
        onEdit={async (role) => {
          // window.prompt is NOT implemented in Electron (returns null), so
          // rename through an in-app input instead.
          const renamed = await (await import('../../utils/promptName')).promptName('Role name', role.name);
          if (renamed === null || renamed.trim() === '') return;
          try {
            await updateRole(serverId, role.id, { name: renamed.trim() });
            addToast('Role updated.', 'success');
            loadRoles();
          } catch (e: any) { addToast(e?.message || 'Failed.', 'error'); }
        }}
        onDelete={async (roleId) => {
          if (!window.confirm('Delete this role?')) return;
          try {
            await deleteRole(serverId, roleId);
            addToast('Role deleted.', 'success');
            loadRoles();
          } catch (e: any) { addToast(e?.message || 'Failed.', 'error'); }
        }}
        onReorder={async (renumbered) => {
          setRoles(renumbered);
          for (const r of renumbered) {
            try { await updateRole(serverId, r.id, { position: r.position }); } catch { /* ignore */ }
          }
        }}
      />
      <div className="vox-card" style={{ padding: '16px' }}>
        <h4 style={{ color: 'var(--ghost-white)', margin: '0 0 10px', fontSize: '14px' }}>Permission Bitfield Editor</h4>
        <PermissionEditor
          value={roles[0] ? BigInt(roles[0].permissions || '0') : 0n}
          onChange={async (val) => {
            if (!roles[0]) return;
            try {
              await updateRole(serverId, roles[0].id, { permissions: val.toString() });
              addToast('Permissions saved to first role.', 'success');
              loadRoles();
            } catch (e: any) { addToast(e?.message || 'Failed.', 'error'); }
          }}
        />
        <p style={{ color: 'var(--ash)', fontSize: '11px', marginTop: '8px' }}>
          Editing the highest-position role. Reorder roles to target a different one.
        </p>
      </div>
    </div>
  );

  const renderMembers = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {members.map((m) => (
          <button
            key={m.userId}
            onClick={() => onMemberPick(m)}
            className="angular-button"
            style={{
              padding: '6px 12px', fontSize: '12px',
              background: selectedMember?.userId === m.userId ? 'var(--chaos)' : undefined,
            }}
          >
            {m.user?.displayName || m.user?.username || m.userId.slice(0, 8)}
          </button>
        ))}
      </div>
      {selectedMember && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h4 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '14px' }}>
              {selectedMember.user?.displayName || selectedMember.user?.username || selectedMember.userId.slice(0, 8)}
            </h4>
            <WarningCounter serverId={serverId} targetId={selectedMember.userId} />
            <TimeoutTimer serverId={serverId} targetId={selectedMember.userId} />
            {memberState?.customPowers && Object.keys(memberState.customPowers).length > 0 && (
              <CustomPowerBadge powers={Object.keys(memberState.customPowers).map((id) => ({ name: id }))} />
            )}
          </div>
          <MemberModCard
            serverId={serverId}
            memberId={selectedMember.userId}
            memberName={selectedMember.user?.displayName || selectedMember.user?.username || selectedMember.userId.slice(0, 8)}
          />
          <ChannelPermissions serverId={serverId} channelId={channelId} />
        </div>
      )}
      {!selectedMember && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>Select a member above to take moderation actions.</p>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '20px' }}>Moderation Center</h2>
        <p style={{ color: 'var(--ash)', fontSize: '12px', margin: '4px 0 0' }}>
          Discord-grade moderation: roles, permissions, actions, appeals, automod, custom powers & escalation.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid var(--rim)', paddingBottom: '8px' }}>
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            style={{
              padding: '6px 12px', fontSize: '12px', fontWeight: 600,
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              background: sub === t.key ? 'var(--chaos)' : 'transparent',
              color: sub === t.key ? '#fff' : 'var(--shadow)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sub}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {sub === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <ModStats serverId={serverId} />
              <ModLogViewer serverId={serverId} />
            </div>
          )}
          {sub === 'ROLES' && (rolesLoading ? <p style={{ color: 'var(--ash)' }}>Loading roles...</p> : renderRoles())}
          {sub === 'MEMBERS' && renderMembers()}
          {sub === 'LOG' && <ModLogViewer serverId={serverId} />}
          {sub === 'APPEALS' && <AppealManager serverId={serverId} />}
          {sub === 'AUTOMOD' && <AutoModDashboard serverId={serverId} />}
          {sub === 'POWERS' && <CustomPowerManager serverId={serverId} members={members as any} />}
          {sub === 'ESCALATION' && <EscalationRules serverId={serverId} />}
          {sub === 'QUARANTINE' && <QuarantineQueue serverId={serverId} />}
          {sub === 'STATS' && <ModStats serverId={serverId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ModerationCenter;
