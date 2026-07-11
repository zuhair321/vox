// Vox Mobile — Chat: Link Preview Card

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';
import { ExternalLink, Link2 } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { api } from '../../api/client';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewCardProps {
  url: string;
}

async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const data = await api<LinkPreview>(`/api/link-preview?url=${encodeURIComponent(url)}`, { skipAuth: true });
    return data;
  } catch {
    return null;
  }
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);

  useEffect(() => {
    if (!url.match(/^https?:\/\//i)) return;
    fetchLinkPreview(url).then(setPreview).catch(() => {});
  }, [url]);

  if (!preview) return null;

  const handlePress = async () => {
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {preview.image && (
          <Image source={{ uri: preview.image }} style={styles.image} resizeMode="cover" />
        )}
        <View style={styles.textContent}>
          {preview.siteName && <Text style={styles.siteName}>{preview.siteName}</Text>}
          {preview.title && <Text style={styles.title} numberOfLines={2}>{preview.title}</Text>}
          {preview.description && <Text style={styles.desc} numberOfLines={2}>{preview.description}</Text>}
        </View>
      </View>
      <View style={styles.linkRow}>
        <Link2 size={12} color={colors.textMuted} />
        <Text style={styles.url} numberOfLines={1}>{url}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Extract URLs from message content
export function extractUrls(text: string): string[] {
  const matches = text.matchAll(/https?:\/\/[^\s<>\"']+/gi);
  return [...matches].map(m => m[0]);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.xs, overflow: 'hidden',
  },
  content: { flexDirection: 'row' },
  image: {
    width: 80, height: 80,
    backgroundColor: colors.bgSecondary,
  },
  textContent: { flex: 1, padding: spacing.sm },
  siteName: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  url: { flex: 1, fontSize: 11, color: colors.textMuted },
});
