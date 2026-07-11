import React from 'react';

interface VoxCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const VoxCard: React.FC<VoxCardProps> = ({ children, className = '', style }) => (
  <section className={`vox-card ${className}`.trim()} style={style}>{children}</section>
);

export default VoxCard;
