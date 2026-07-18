import React from 'react';
import { Permissions, permissionNames, combinePermissions } from '../../lib/permissions';

interface Props {
  value: bigint;
  onChange: (value: bigint) => void;
}

const PermissionEditor: React.FC<Props> = ({ value, onChange }) => {
  const toggle = (perm: string) => {
    const bit = (Permissions as any)[perm] as bigint;
    if ((value & bit) === bit) {
      onChange(value & ~bit);
    } else {
      onChange(value | bit);
    }
  };

  const groups: Record<string, string[]> = {
    General: ['CREATE_INSTANT_INVITE', 'KICK_MEMBERS', 'BAN_MEMBERS', 'ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_SERVER'],
    Messages: ['ADD_REACTIONS', 'VIEW_AUDIT_LOG', 'PRIORITY_SPEAKER', 'STREAM', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'MANAGE_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'MENTION_EVERYONE', 'USE_EXTERNAL_EMOJIS'],
    Voice: ['CONNECT', 'SPEAK', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS', 'USE_VAD'],
    Advanced: ['CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 'MANAGE_ROLES', 'MANAGE_WEBHOOKS', 'MANAGE_EXPRESSIONS'],
    VOX: ['USE_APPLICATION_COMMANDS', 'REQUEST_TO_SPEAK', 'MANAGE_EVENTS', 'MANAGE_THREADS', 'CREATE_PUBLIC_THREADS', 'CREATE_PRIVATE_THREADS', 'USE_EXTERNAL_STICKERS', 'SEND_MESSAGES_IN_THREADS'],
    Moderation: ['TIMEOUT_MEMBERS', 'MODERATE_MEMBERS', 'VIEW_MODERATION_LOG', 'MANAGE_AUTOMOD', 'BYPASS_AUTOMOD', 'MANAGE_CUSTOM_POWERS', 'VIEW_SERVER_INSIGHTS'],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(groups).map(([group, perms]) => (
        <div key={group}>
          <h4 style={{ color: 'var(--shadow)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
            {group}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px' }}>
            {perms.map((perm) => {
              const bit = (Permissions as any)[perm] as bigint;
              const active = (value & bit) === bit;
              return (
                <label key={perm} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                  background: active ? 'rgba(216,74,90,0.12)' : 'transparent',
                  fontSize: '12px', color: active ? 'var(--ghost-white)' : 'var(--shadow)',
                }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(perm)}
                    style={{ accentColor: 'var(--chaos)' }}
                  />
                  {perm.replace(/_/g, ' ')}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ color: 'var(--ash)', fontSize: '11px', marginTop: '8px' }}>
        Active: {permissionNames(value).join(', ') || 'None'}
      </div>
    </div>
  );
};

export default PermissionEditor;
