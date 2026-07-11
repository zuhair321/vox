// Vox Mobile — DM Conversation Screen

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDMStore } from '../../stores/dmStore';
import { useSocketStore } from '../../stores/socketStore';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, fontSize } from '../../utils/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DMStackParamList } from '../../navigation/DMStack';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { MessageInput } from '../../components/chat/MessageInput';
import { Avatar } from '../../components/common/Avatar';
import { ArrowLeft } from 'lucide-react-native';
import type { DMMessage } from '../../types';

type Route = RouteProp<DMStackParamList, 'DMConversation'>;

export function DMConversationScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { dmId, recipientId, recipientName } = route.params;

  const user = useAuthStore(s => s.user);
  const { messages, typing, fetchMessages, markRead } = useDMStore();
  const { sendDM, startDmTyping, stopDmTyping, sendDmRead } = useSocketStore();

  const dmMessages = messages[dmId] || [];
  const dmTyping = typing[dmId] || [];

  useEffect(() => {
    fetchMessages(dmId);
    markRead(dmId);
    sendDmRead(dmId);
  }, [dmId]);

  const handleSend = useCallback((content: string) => {
    sendDM(recipientId, content);
  }, [recipientId]);

  const handleTypingStart = useCallback(() => {
    startDmTyping(recipientId);
  }, [recipientId]);

  const handleTypingStop = useCallback(() => {
    stopDmTyping(recipientId);
  }, [recipientId]);

  const renderMessage = useCallback(({ item, index }: { item: DMMessage; index: number }) => {
    const prevMessage = index > 0 ? dmMessages[index - 1] : null;
    const isGrouped = prevMessage?.senderId === item.senderId &&
      new Date(item.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000;

    // Convert DMMessage to Message shape for MessageBubble
    const messageForBubble = {
      id: item.id,
      channelId: item.dmId,
      userId: item.senderId,
      authorOverride: null,
      body: item.deleted ? '*This message was deleted*' : item.content,
      edited: item.edited,
      deleted: item.deleted,
      pinned: false,
      parentId: null,
      attachments: item.attachments || [],
      createdAt: item.createdAt,
      author: item.sender ? {
        id: item.sender.id,
        username: item.sender.username,
        displayName: item.sender.displayName,
        status: item.sender.status as any,
        avatarUrl: item.sender.avatarUrl,
        color: item.sender.color || colors.accent,
      } : undefined,
    };

    return (
      <MessageBubble
        message={messageForBubble}
        isOwn={item.senderId === user?.id}
        isGrouped={isGrouped}
      />
    );
  }, [dmMessages, user?.id]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Avatar name={recipientName} size={32} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{recipientName}</Text>
          {dmTyping.length > 0 && (
            <Text style={styles.typingText}>typing...</Text>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={dmMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        inverted
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Say hello to {recipientName}!</Text>
          </View>
        }
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        placeholder={`Message ${recipientName}`}
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
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  typingText: {
    fontSize: fontSize.xs,
    color: colors.accentLight,
  },
  messageList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
    transform: [{ scaleY: -1 }],
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
