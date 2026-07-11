import React from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface AvatarRingProps {
  amplitude: number; // 0-1 representing audio amplitude
  size?: number; // diameter of the ring in pixels
  color?: string; // CSS color value
  className?: string;
}

const AvatarRing: React.FC<AvatarRingProps> = ({
  amplitude,
  size = 40,
  color = 'var(--toxic)',
  className = '',
}) => {
  // Use motion values for smooth spring-based animation
  const thickness = useMotionValue(2);
  const blur = useMotionValue(0);
  const opacity = useMotionValue(0.3);

  // Update motion values when amplitude changes via spring
  React.useEffect(() => {
    thickness.set(2 + amplitude * 4);
    blur.set(amplitude * 8);
    opacity.set(0.3 + amplitude * 0.6);
  }, [amplitude, thickness, blur, opacity]);

  return (
    <motion.span
      className={`avatar-ring ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
      }}
    >
      <motion.span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '50%',
          boxShadow: `0 0 ${blur.get()}px ${thickness.get()}px ${color}`,
          opacity: opacity.get(),
          pointerEvents: 'none',
        }}
      />
    </motion.span>
  );
};

export default AvatarRing;
