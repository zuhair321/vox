// Vox Mobile — Voice Channel Screen

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useVoiceStore } from '../../stores/voiceStore';
import { useSocketStore } from '../../stores/socketStore';
import { voiceRTC } from '../../services/voiceRTC';
import { VoiceControls } from '../../components/voice/VoiceControls';
import { colors, spacing, fontSize } from '../../utils/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ServerStackParamList } from '../../navigation/ServerStack';
import { ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

type Route = RouteProp<ServerStackParamList, 'VoiceChannel'>;

export function VoiceChannelScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { serverId, channelId: voiceChannelId } = route.params;
  const { isConnected, channelId, peers, isDeafened, remoteStreams, joinVoice: storeJoinVoice, leaveVoice: storeLeaveVoice } = useVoiceStore();
  const { joinVoice: socketJoinVoice, leaveVoice: socketLeaveVoice } = useSocketStore();

  useEffect(() => {
    if (!isConnected) {
      storeJoinVoice(voiceChannelId, serverId);
      socketJoinVoice(voiceChannelId, serverId);
    }
    return () => {
      if (isConnected) {
        socketLeaveVoice();
        voiceRTC.leave();
        storeLeaveVoice();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Voice Channel</Text>
          <Text style={styles.subtitle}>
            {isConnected ? `${peers.length + 1} connected` : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* Remote audio — RTCView must be mounted for audio to play (esp. iOS). */}
      <View style={styles.audioLayer}>
        {!isDeafened &&
          remoteStreams.map(({ socketId, stream }) => (
            <RTCView
              key={socketId}
              streamURL={stream.toURL()}
              objectFit="cover"
              style={styles.audioSink}
            />
          ))}
      </View>

      <VoiceControls />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.xl + 20,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  audioLayer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
    left: -100,
  },
  audioSink: {
    width: 1,
    height: 1,
  },
});
