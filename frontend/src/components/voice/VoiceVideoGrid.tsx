import React, { useEffect, useRef, useCallback } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';

// VoiceVideoGrid — renders a responsive grid of <video> elements for all
// active webcam and screen-share streams. Each cell shows the video feed,
// a username overlay, and status indicators (speaking, muted, screen sharing).
//
// Layout adapts to the number of participants:
//   1 stream: full width
//   2 streams: side by side
//   3-4 streams: 2x2 grid
//   5-6 streams: 3x2 grid
//   7+: auto-fill with min 200px columns

interface VideoCellProps {
  label: string;
  sublabel?: string;
  stream: MediaStream | null;
  muted?: boolean;
  speaking?: boolean;
  screenSharing?: boolean;
}

const VideoCell: React.FC<VideoCellProps> = ({ label, sublabel, stream, muted, speaking, screenSharing }) => {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--void)',
        borderRadius: '6px',
        overflow: 'hidden',
        border: speaking ? '2px solid var(--toxic)' : '2px solid var(--rim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '120px',
        transition: 'border-color 0.2s ease',
        boxShadow: speaking ? '0 0 12px rgba(74,194,82,0.3)' : 'none',
      }}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={!!muted}
        controls={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: 'black',
        }}
      />
      {/* Username badge — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(12, 9, 11, 0.85)',
          border: '1px solid var(--rim)',
          borderRadius: '4px',
          padding: '4px 8px',
          color: 'var(--ghost-white)',
          fontSize: '11px',
          fontFamily: "'Share Tech Mono', monospace",
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: speaking ? 'var(--toxic)' : 'var(--ash)' }}>●</span>
        <span>{label}</span>
        {sublabel && (
          <span style={{ color: 'var(--ash)', fontWeight: 400, marginLeft: '4px' }}>
            {sublabel}
          </span>
        )}
      </div>
      {/* Status icons — top-right */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          pointerEvents: 'none',
        }}
      >
        {muted && (
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'rgba(216,74,90,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: 'white',
          }}>
            🎤
          </div>
        )}
        {screenSharing && (
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'rgba(74,194,82,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: 'white',
          }}>
            🖥️
          </div>
        )}
      </div>
      {/* No video placeholder */}
      {!stream && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div
            className="octagon"
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, var(--void-purple), var(--obsidian))',
              border: '1px solid var(--rim)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--ghost-white)',
            }}
          >
            {label.slice(0, 1).toUpperCase()}
          </div>
          <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>{label}</span>
        </div>
      )}
    </div>
  );
};

const VoiceVideoGrid: React.FC = () => {
  const voice = useVoiceStore();

  // Build list of all video sources (local + remote)
  const videoSources: Array<{
    key: string;
    label: string;
    sublabel?: string;
    stream: MediaStream | null;
    muted?: boolean;
    speaking?: boolean;
    screenSharing?: boolean;
  }> = [];

  // Local user — camera video
  if (voice.localVideo && voice.localStream) {
    const localVideoTrack = voice.localStream.getVideoTracks()[0];
    if (localVideoTrack) {
      // Create a MediaStream with just the video track for the grid
      const localVideoStream = new MediaStream([localVideoTrack]);
      videoSources.push({
        key: 'local-video',
        label: 'You',
        sublabel: 'Camera',
        stream: localVideoStream,
        muted: true, // Don't play back local audio
        speaking: voice.localSpeaking,
      });
    }
  }

  // Local user — screen share
  if (voice.screenSharing && voice.localScreenStream) {
    videoSources.push({
      key: 'local-screen',
      label: 'You',
      sublabel: 'Screen',
      stream: voice.localScreenStream,
      muted: true,
    });
  }

  // Remote users — screen shares
  voice.remoteScreenStreams.forEach((stream, socketId) => {
    const user = voice.voiceUsers.find(u => u.socketId === socketId);
    videoSources.push({
      key: `remote-screen-${socketId}`,
      label: user?.username || 'Screen',
      sublabel: 'Screen',
      stream,
      speaking: user?.speaking,
    });
  });

  // Remote users — webcam video
  voice.remoteVideoStreams.forEach((stream, socketId) => {
    const user = voice.voiceUsers.find(u => u.socketId === socketId);
    videoSources.push({
      key: `remote-video-${socketId}`,
      label: user?.username || 'User',
      sublabel: 'Camera',
      stream,
      muted: user?.muted,
      speaking: user?.speaking,
    });
  });

  // Don't render if there are no video sources
  if (videoSources.length === 0) return null;

  // Compute grid columns based on count
  const count = videoSources.length;
  let gridCols: string;
  if (count === 1) {
    gridCols = '1fr';
  } else if (count === 2) {
    gridCols = 'repeat(2, 1fr)';
  } else if (count <= 4) {
    gridCols = 'repeat(2, 1fr)';
  } else if (count <= 6) {
    gridCols = 'repeat(3, 1fr)';
  } else {
    gridCols = 'repeat(auto-fill, minmax(200px, 1fr))';
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: '8px',
        padding: '8px 16px',
        background: 'var(--abyss)',
        borderBottom: '1px solid var(--rim)',
        maxHeight: '50vh',
        overflowY: 'auto',
      }}
    >
      {videoSources.map(source => (
        <VideoCell
          key={source.key}
          label={source.label}
          sublabel={source.sublabel}
          stream={source.stream}
          muted={source.muted}
          speaking={source.speaking}
          screenSharing={source.screenSharing}
        />
      ))}
    </div>
  );
};

export default VoiceVideoGrid;
