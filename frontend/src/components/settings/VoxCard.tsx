import React from 'react';

interface VoxCardProps {
  children: React.ReactNode;
  className?: string;
}

const VoxCard: React.FC<VoxCardProps> = ({ children, className = '' }) => (
  <section className={`vox-card ${className}`.trim()}>{children}</section>
);

export default VoxCard;
