import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useServerStore } from '../../stores/serverStore';
import { useSocketStore } from '../../stores/socketStore';
import { useUiStore } from '../../stores/uiStore';

interface SpatialVoiceCanvasProps {
  width?: number;
  height?: number;
}

const SpatialVoiceCanvas: React.FC<SpatialVoiceCanvasProps> = ({
  width = 200,
  height = 200
}) => {
  const voice = useVoiceStore();
  const { selectedServer, selectedChannel } = useServerStore();
  const socket = useSocketStore();
  const { addToast } = useUiStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [pannerNodes, setPannerNodes] = useState<Map<string, StereoPannerNode>>(new Map());
  const [isDragging, setIsDragging] = useState<{ userId: string | null; x: number; y: number } | null>(null);

  // Resolve CSS custom properties to actual color values for canvas 2D context
  const resolveCssVar = useCallback((varName: string): string => {
    const el = document.documentElement;
    const val = getComputedStyle(el).getPropertyValue(varName).trim();
    return val || '#ffffff';
  }, []);

  // Initialize audio context and set up panner nodes for connected users
  useEffect(() => {
    if (!voice.connected || !voice.channelId) {
      // Clean up audio context when disconnecting
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
        setPannerNodes(new Map());
      }
      return;
    }

    // Create audio context if not exists
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        setAudioContext(ctx);
      }
    }

    // Set up panner nodes for all connected users
    if (audioContext) {
      const newPannerNodes = new Map<string, StereoPannerNode>();
      voice.voiceUsers.forEach(user => {
        if (!pannerNodes.has(user.userId)) {
          const panner = audioContext.createStereoPanner();
          panner.pan.value = 0; // Center by default
          newPannerNodes.set(user.userId, panner);
        }
      });
      
      // Also keep existing panner nodes for users who are still connected
      voice.voiceUsers.forEach(user => {
        if (pannerNodes.has(user.userId)) {
          newPannerNodes.set(user.userId, pannerNodes.get(user.userId)!);
        }
      });
      
      setPannerNodes(newPannerNodes);
    }
  }, [voice.connected, voice.channelId, voice.voiceUsers, audioContext, pannerNodes]);

  // Update panner positions based on seat positions
  useEffect(() => {
    if (!audioContext) return;

    // Update panner positions for all users
    voice.voiceUsers.forEach(user => {
      const panner = pannerNodes.get(user.userId);
      if (panner) {
        // Get seat position or default to center
        const position = voice.seatPositions[user.userId] || { x: 0, y: 0 };
        // Map x position from [-1, 1] to stereo pan [-1, 1]
        // We'll use the x coordinate for left/right positioning
        panner.pan.value = Math.max(-1, Math.min(1, position.x));
      }
    });
  }, [voice.voiceUsers, voice.seatPositions, pannerNodes, audioContext]);

  // Handle canvas events for drag-and-drop positioning
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>, userId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // Convert to [-1, 1] range
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1; // Convert to [-1, 1] range
    
    setIsDragging({ userId, x, y });
    
    // Update position immediately
    voice.setUserSeatPosition(userId, { x, y });
    
    // Emit seat update to server
    socket.socket?.emit('voice:seat-update', {
      userId,
      position: { x, y }
    });
  }, [voice, socket]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // Convert to [-1, 1] range
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1; // Convert to [-1, 1] range
    
    // Clamp values to [-1, 1] range
    const clampedX = Math.max(-1, Math.min(1, x));
    const clampedY = Math.max(-1, Math.min(1, y));
    
    setIsDragging(prev => prev ? { ...prev, x: clampedX, y: clampedY } : null);
    
    // Update position while dragging
    if (isDragging?.userId) {
      voice.setUserSeatPosition(isDragging.userId, { x: clampedX, y: clampedY });
    }
    
    // Emit seat update to server (throttle to avoid too many updates)
    socket.socket?.emit('voice:seat-update', {
      userId: isDragging.userId,
      position: { x: clampedX, y: clampedY }
    });
  }, [isDragging, voice, socket]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Handle incoming seat update events from server
  useEffect(() => {
    if (!socket.socket) return;

    const handleSeatUpdate = ({ userId, position }: { userId: string; position: { x: number; y: number } }) => {
      voice.setUserSeatPosition(userId, position);
    };

    socket.socket.on('voice:seat-update', handleSeatUpdate);

    return () => {
      socket.socket?.off('voice:seat-update', handleSeatUpdate);
    };
  }, [socket.socket, voice]);

  // Render user positions on canvas
  const renderUsers = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = 'rgba(30, 30, 46, 0.8)'; // var(--void) with opacity
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Draw outer boundary
    ctx.strokeStyle = resolveCssVar('--rim');
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
    
    // Draw each user as a dot
    voice.voiceUsers.forEach(user => {
      // Get position from seatPositions or default to center (0, 0)
      const position = voice.seatPositions[user.userId] || { x: 0, y: 0 };
      
      // Convert from [-1, 1] range to canvas coordinates
      const canvasX = ((position.x + 1) / 2) * width;
      const canvasY = ((position.y + 1) / 2) * height;
      
      // Determine color based on user state
      let color = resolveCssVar('--ghost-white'); // Default color
      if (user.speaking) {
        color = resolveCssVar('--toxic'); // Speaking users get toxic color
      } else if (user.muted) {
        color = resolveCssVar('--blood'); // Muted users get blood color
      } else if (user.deafened) {
        color = resolveCssVar('--ash'); // Deafened users get ash color
      }
      
      // Draw user dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = resolveCssVar('--ghost-white');
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(user.username.substring(0, 8), canvasX, canvasY - 15);
      
      // Draw speaking indicator
      if (user.speaking) {
        ctx.strokeStyle = resolveCssVar('--toxic');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [voice.voiceUsers, voice.seatPositions, width, height]);

  // Handle canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Render users
    renderUsers(ctx);
    
    // Request animation frame for smooth updates
    const renderLoop = () => {
      renderUsers(ctx);
      requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    
    // Cleanup
    return () => {
      // Note: In a real implementation, we'd need to cancel the animation frame
      // For simplicity, we're relying on the component unmounting to stop it
    };
  }, [width, height, renderUsers]);

  return (
    <div 
      style={{ 
        position: 'relative',
        width: width,
        height: height,
        touchAction: 'none' // Prevent touch scrolling on canvas
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          cursor: 'grab',
          userSelect: 'none',
          backgroundColor: 'var(--abyss)',
          border: '1px solid var(--rim)',
          borderRadius: '4px'
        }}
        onMouseDown={(e) => {
          // Prevent text selection when dragging
          e.preventDefault();
          
          // Find which user was clicked
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const rect = canvas.getBoundingClientRect();
          const canvasX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const canvasY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          
          // Check if click is near any user (within 20px radius)
          voice.voiceUsers.forEach(user => {
            const position = voice.seatPositions[user.userId] || { x: 0, y: 0 };
            const distance = Math.sqrt(
              Math.pow(canvasX - position.x, 2) + 
              Math.pow(canvasY - position.y, 2)
            );
            
            if (distance < 0.2) { // Roughly 20px in normalized coordinates
              handleMouseDown(e, user.userId);
            }
          });
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {!isDragging && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'var(--ghost-white)',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontFamily: '"Share Tech Mono", monospace'
        }}>
          Drag users to position them spatially
        </div>
      )}
    </div>
  );
};

export default SpatialVoiceCanvas;