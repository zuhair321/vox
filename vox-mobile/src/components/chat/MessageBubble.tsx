// Vox Mobile — Chat: Message Bubble

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '../common/Avatar';
import { StatusDot } from '../common/StatusDot';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import type { Message } from '../../types';
import { LinkPreviewCard, extractUrls } from './LinkPreviewCard';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean;
}

export function MessageBubble({ message, isOwn, isGrouped }: MessageBubbleProps) {
  if (message.deleted) {
    return (
      <View style={[styles.container, isGrouped && styles.grouped]}>
        {!isGrouped && <View style={styles.avatarSpacer} />}
        <Text style={styles.deletedText}>*This message was deleted*</Text>
      </View>
    );
  }

  const authorName = message.author?.displayName || message.authorOverride || 'Unknown';
  const authorColor = message.author?.color || colors.accent;
  const roleColors: Record<string, string> = {
    FOUNDER: colors.founder,
    ADMIN: colors.admin,
    MODERATOR: colors.moderator,
  };
  const roleColor = message.author?.role ? roleColors[message.author.role] : undefined;

  return (
    <View style={[styles.container, isGrouped && styles.grouped]}>
      {!isGrouped ? (
        <View style={styles.avatarContainer}>
          <Avatar
            uri={message.author?.avatarUrl}
            name={authorName}
            color={authorColor}
            size={36}
          />
        </View>
      ) : (
        <View style={styles.avatarSpacer} />
      )}

      <View style={styles.content}>
        {!isGrouped && (
          <View style={styles.authorRow}>
            <Text style={[styles.authorName, { color: authorColor }]}>
              {authorName}
            </Text>
            {roleColor && (
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {message.author?.role}
                </Text>
              </View>
            )}
            <Text style={styles.timestamp}>
              {formatTime(message.createdAt)}
            </Text>
          </View>
        )}

        <Text style={styles.body}>{message.body}</Text>

        {/* Link Previews */}
        {extractUrls(message.body).slice(0, 2).map((url, i) => (
          <LinkPreviewCard key={i} url={url} />
        ))}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <View style={styles.reactionsRow}>
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <View key={emoji} style={styles.reaction}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={styles.reactionCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  grouped: {
    paddingTop: 2,
  },
  avatarContainer: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  avatarSpacer: {
    width: 36,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textDim,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  deletedText: {
    fontSize: fontSize.md,
    color: colors.textDim,
    fontStyle: 'italic',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionEmoji: {
    fontSize: fontSize.sm,
  },
  reactionCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
