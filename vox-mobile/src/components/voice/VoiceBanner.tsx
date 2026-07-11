// Vox Mobile — Voice Banner (persistent banner when in voice channel)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useVoiceStore } from '../../stores/voiceStore';
import { useSocketStore } from '../../stores/socketStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react-native';

export function VoiceBanner() {
  const { isConnected, channelId, peers, isMuted, isDeafened, toggleMute, toggleDeafen, leaveVoice } = useVoiceStore();
  const { sendVoiceMute, sendVoiceDeafen } = useSocketStore();

  if (!isConnected) return null;

  const handleToggleMute = () => {
    toggleMute();
    sendVoiceMute(!isMuted);
  };

  const handleToggleDeafen = () => {
    toggleDeafen();
    sendVoiceDeafen(!isDeafened);
  };

  const handleLeave = () => {
    leaveVoice();
    // Socket emit handled by voice store subscription
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.greenDot} />
        <Text style={styles.text}>Voice Connected</Text>
        <Text style={styles.peerCount}>
          {peers.length + 1} {peers.length + 1 === 1 ? 'person' : 'people'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={handleToggleMute}
        >
          {isMuted ? (
            <MicOff size={18} color={colors.white} />
          ) : (
            <Mic size={18} color={colors.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isDeafened && styles.controlButtonActive]}
          onPress={handleToggleDeafen}
        >
          {isDeafened ? (
            <VolumeX size={18} color={colors.white} />
          ) : (
            <Volume2 size={18} color={colors.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.leaveButton]}
          onPress={handleLeave}
        >
          <PhoneOff size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#1a2332',
    borderBottomWidth: 1,
    borderBottomColor: '#2a3a4a',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
  peerCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
  },
  controlButtonActive: {
    backgroundColor: colors.danger,
  },
  leaveButton: {
    backgroundColor: colors.danger,
  },
});
