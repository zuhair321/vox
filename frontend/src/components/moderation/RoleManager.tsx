import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Role {
  id: string;
  name: string;
  position: number;
  color: string;
  permissions: string;
}

interface Props {
  roles: Role[];
  onReorder: (roles: Role[]) => void;
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
  onCreate: () => void;
}

const RoleManager: React.FC<Props> = ({ roles, onReorder, onEdit, onDelete, onCreate }) => {
  const [dragId, setDragId] = useState<string | null>(null);

  const sorted = [...roles].sort((a, b) => b.position - a.position);

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const fromIdx = sorted.findIndex((r) => r.id === dragId);
    const toIdx = sorted.findIndex((r) => r.id === targetId);
    const next = [...sorted];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const renumbered = next.map((r, i) => ({ ...r, position: next.length - i }));
    onReorder(renumbered);
    setDragId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Roles</h3>
        <button className="angular-button primary" onClick={onCreate} style={{ padding: '6px 14px', fontSize: '12px' }}>
          + Create Role
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <AnimatePresence>
          {sorted.map((role) => (
            <motion.div
              key={role.id}
              draggable
              onDragStart={() => handleDragStart(role.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(role.id)}
              whileHover={{ scale: 1.01 }}
              className="vox-card"
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'grab',
                border: dragId === role.id ? '2px dashed var(--chaos)' : undefined,
              }}
            >
              <span style={{ fontSize: '18px' }}>⋮⋮</span>
              <span style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: role.color, flexShrink: 0,
              }} />
              <span style={{ color: 'var(--ghost-white)', fontSize: '13px', fontWeight: 600, flex: 1 }}>
                {role.name}
              </span>
              <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>Pos: {role.position}</span>
              <button className="angular-button" onClick={() => onEdit(role)} style={{ padding: '4px 10px', fontSize: '11px' }}>
                Edit
              </button>
              <button className="angular-button" onClick={() => onDelete(role.id)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--chaos)' }}>
                Delete
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoleManager;
