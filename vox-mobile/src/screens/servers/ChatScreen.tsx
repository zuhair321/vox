// Vox Mobile — Chat Screen

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useMessageStore } from '../../stores/messageStore';
import { useSocketStore } from '../../stores/socketStore';
import { useAuthStore } from '../../stores/authStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ServerStackParamList } from '../../navigation/ServerStack';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { MessageInput } from '../../components/chat/MessageInput';
import { VoiceBanner } from '../../components/voice/VoiceBanner';
import { ArrowLeft, Phone } from 'lucide-react-native';
import type { Message } from '../../types';

type Route = RouteProp<ServerStackParamList, 'Chat'>;

export function ChatScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { channelId, channelName, serverId } = route.params;

  const user = useAuthStore(s => s.user);
  const { messages, loading, hasMore, typingUsers, fetchMessages, markRead } = useMessageStore();
  const { joinChannel, leaveChannel, sendMessage, startTyping, stopTyping } = useSocketStore();
  const voice = useVoiceStore();

  const channelMessages = messages[channelId] || [];
  const channelTyping = typingUsers[channelId] || [];
  const isLoadingMessages = loading[channelId];
  const canLoadMore = hasMore[channelId];

  useEffect(() => {
    joinChannel(channelId);
    fetchMessages(channelId);
    markRead(channelId);

    return () => {
      leaveChannel(channelId);
    };
  }, [channelId]);

  const handleLoadMore = useCallback(() => {
    if (canLoadMore && !isLoadingMessages && channelMessages.length > 0) {
      fetchMessages(channelId, channelMessages[0].id);
    }
  }, [canLoadMore, isLoadingMessages, channelMessages, channelId]);

  const handleSend = useCallback((content: string, gifUrl?: string) => {
    if (gifUrl) {
      // Send as a message with the GIF URL appended
      sendMessage(channelId, content ? `${content} ${gifUrl}` : gifUrl);
    } else {
      sendMessage(channelId, content);
    }
  }, [channelId]);

  const handleTypingStart = useCallback(() => {
    startTyping(channelId);
  }, [channelId]);

  const handleTypingStop = useCallback(() => {
    stopTyping(channelId);
  }, [channelId]);

  const handleJoinVoice = useCallback(() => {
    voice.joinVoice(channelId, serverId);
    // TODO: Initialize WebRTC
  }, [channelId, serverId]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const prevMessage = index > 0 ? channelMessages[index - 1] : null;
    const isGrouped = prevMessage?.userId === item.userId &&
      new Date(item.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000;

    return (
      <MessageBubble
        message={item}
        isOwn={item.userId === user?.id}
        isGrouped={isGrouped}
      />
    );
  }, [channelMessages, user?.id]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.channelName}>#{channelName}</Text>
          {channelTyping.length > 0 && (
            <Text style={styles.typingText}>
              {channelTyping.join(', ')} {channelTyping.length === 1 ? 'is' : 'are'} typing...
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleJoinVoice} style={styles.voiceButton}>
          <Phone size={20} color={voice.isConnected ? colors.success : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Voice Banner */}
      {voice.isConnected && <VoiceBanner />}

      {/* Messages */}
      <FlatList
        data={channelMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        inverted
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          isLoadingMessages ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          !isLoadingMessages ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Be the first to say something!</Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        placeholder={`Message #${channelName}`}
        channelId={channelId}
        serverId={serverId}
      />
    </KeyboardAvoidingView>
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
    paddingTop: spacing.xl + 20, // Safe area
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
  channelName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  typingText: {
    fontSize: fontSize.xs,
    color: colors.accentLight,
    marginTop: 2,
  },
  voiceButton: {
    padding: spacing.sm,
  },
  messageList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  loader: {
    padding: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
    transform: [{ scaleY: -1 }], // Because list is inverted
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
});
