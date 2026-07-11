// Vox Mobile — Voice Controls

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useVoiceStore } from '../../stores/voiceStore';
import { useSocketStore } from '../../stores/socketStore';
import { voiceRTC } from '../../services/voiceRTC';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react-native';
import { Avatar } from '../common/Avatar';

export function VoiceControls() {
  const { peers, isMuted, isDeafened, toggleMute, toggleDeafen, leaveVoice } = useVoiceStore();
  const { sendVoiceMute, sendVoiceDeafen } = useSocketStore();

  const handleToggleMute = () => {
    const next = !isMuted;
    toggleMute();
    sendVoiceMute(next);
    voiceRTC.setLocalMuted(next);
  };

  const handleToggleDeafen = () => {
    const next = !isDeafened;
    toggleDeafen();
    sendVoiceDeafen(next);
    // Deafen also mutes the local mic.
    voiceRTC.setLocalMuted(next ? true : !isMuted);
  };

  const handleLeave = () => {
    leaveVoice();
  };

  return (
    <View style={styles.container}>
      {/* Peers list */}
      <View style={styles.peersList}>
        <Text style={styles.sectionTitle}>In Voice ({peers.length + 1})</Text>

        {/* Self */}
        <View style={styles.peerItem}>
          <Avatar name="You" size={36} />
          <Text style={styles.peerName}>You</Text>
          {isMuted && <MicOff size={16} color={colors.danger} />}
        </View>

        {/* Remote peers */}
        {peers.map(peer => (
          <View key={peer.socketId} style={styles.peerItem}>
            <Avatar name={peer.username} size={36} />
            <Text style={styles.peerName}>{peer.username}</Text>
            {peer.isMuted && <MicOff size={16} color={colors.danger} />}
            {peer.isSpeaking && <View style={styles.speakingRing} />}
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.mutedButton]}
          onPress={handleToggleMute}
        >
          {isMuted ? (
            <MicOff size={24} color={colors.white} />
          ) : (
            <Mic size={24} color={colors.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isDeafened && styles.mutedButton]}
          onPress={handleToggleDeafen}
        >
          {isDeafened ? (
            <VolumeX size={24} color={colors.white} />
          ) : (
            <Volume2 size={24} color={colors.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.disconnectButton]}
          onPress={handleLeave}
        >
          <PhoneOff size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
  },
  peersList: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  peerName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  speakingRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
  },
  mutedButton: {
    backgroundColor: colors.danger,
  },
  disconnectButton: {
    backgroundColor: colors.danger,
  },
});
