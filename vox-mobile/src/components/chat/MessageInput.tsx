// Vox Mobile — Chat: Message Input (with GIF picker + attachment picker)

import React, { useState, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, Image, ActivityIndicator, Keyboard, Text,
} from 'react-native';
import { Paperclip, Smile, Send, X, Search, Image as ImageIcon } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';

// GIPHY API — free tier (no key needed for limited use, or use demo mode)
const GIF_API_KEY = 'dc6zaTOxFJmzC'; // Public beta key from Giphy
const GIF_SEARCH_URL = (q: string, offset = 0) =>
  `https://api.giphy.com/v1/gifs/search?api_key=${GIF_API_KEY}&q=${encodeURIComponent(q)}&limit=20&offset=${offset}&rating=g&lang=en`;
const GIF_TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIF_API_KEY}&limit=20&rating=g`;

interface GifItem { id: string; images: { fixed_width: { url: string; width: string; height: string } } }

interface MessageInputProps {
  onSend: (content: string, gifUrl?: string, attachments?: string[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  channelId: string;
  serverId: string;
}

export function MessageInput({ onSend, onTypingStart, onTypingStop, placeholder = 'Type a message...', channelId, serverId }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifOffset, setGifOffset] = useState(0);
  const [hasMoreGifs, setHasMoreGifs] = useState(true);
  const [selectedGif, setSelectedGif] = useState<GifItem | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((value: string) => {
    setText(value);
    if (value.length > 0 && !isTyping.current) {
      isTyping.current = true;
      onTypingStart?.();
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      onTypingStop?.();
    }, 3000);
  }, [onTypingStart, onTypingStop]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !selectedGif) return;

    onSend(trimmed, selectedGif?.images.fixed_width.url);
    setText('');
    setSelectedGif(null);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    isTyping.current = false;
    onTypingStop?.();
  }, [text, selectedGif, onSend, onTypingStop]);

  const loadGifs = useCallback(async (query: string, offset = 0, append = false) => {
    if (!hasMoreGifs && append) return;
    setGifLoading(true);
    try {
      const url = query ? GIF_SEARCH_URL(query, offset) : GIF_TRENDING_URL;
      const res = await fetch(url);
      const data = await res.json();
      const items: GifItem[] = data.data || [];
      setGifs(prev => append ? [...prev, ...items] : items);
      setHasMoreGifs(items.length === 20);
      setGifOffset(offset + items.length);
    } catch { /* ignore */ }
    finally { setGifLoading(false); }
  }, [hasMoreGifs]);

  const handleGifSearch = (q: string) => {
    setGifQuery(q);
    setGifOffset(0);
    setHasMoreGifs(true);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => loadGifs(q, 0, false), 400);
  };

  const handleGifSelect = (gif: GifItem) => {
    setSelectedGif(gif);
    setShowGifPicker(false);
  };

  return (
    <View>
      {/* Selected GIF preview */}
      {selectedGif && (
        <View style={styles.gifPreview}>
          <Image
            source={{ uri: selectedGif.images.fixed_width.url }}
            style={styles.gifPreviewImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.gifRemoveBtn} onPress={() => setSelectedGif(null)}>
            <X size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        {/* Attachment button */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachMenu(v => !v)}
        >
          <Paperclip size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* GIF button */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => {
            setShowGifPicker(true);
            loadGifs('', 0, false);
          }}
        >
          <Smile size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[styles.sendButton, (text.trim().length > 0 || selectedGif) && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!text.trim() && !selectedGif}
        >
          <Send size={18} color={(text.trim() || selectedGif) ? colors.white : colors.textDim} />
        </TouchableOpacity>
      </View>

      {/* GIF Picker Modal */}
      <Modal visible={showGifPicker} animationType="slide" onRequestClose={() => setShowGifPicker(false)}>
        <View style={pickerStyles.container}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Pick a GIF</Text>
            <TouchableOpacity onPress={() => setShowGifPicker(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={pickerStyles.searchRow}>
            <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={pickerStyles.searchInput}
              value={gifQuery}
              onChangeText={handleGifSearch}
              placeholder="Search GIFs..."
              placeholderTextColor={colors.textDim}
              autoFocus
            />
          </View>

          {gifLoading && gifs.length === 0 ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={gifs}
              keyExtractor={g => g.id}
              numColumns={2}
              columnWrapperStyle={pickerStyles.row}
              contentContainerStyle={pickerStyles.list}
              onEndReached={() => loadGifs(gifQuery, gifOffset, true)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={gifLoading && gifs.length > 0 ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 10 }} />
              ) : null}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={pickerStyles.gifItem}
                  onPress={() => handleGifSelect(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.images.fixed_width.url }}
                    style={pickerStyles.gifImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm,
  },
  attachButton: { padding: spacing.sm, marginBottom: 4 },
  input: {
    flex: 1, backgroundColor: colors.bgTertiary, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.text,
    maxHeight: 120, borderWidth: 1, borderColor: colors.border,
  },
  sendButton: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.bgTertiary, marginBottom: 4,
  },
  sendButtonActive: { backgroundColor: colors.accent },
  gifPreview: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    borderRadius: borderRadius.md, overflow: 'hidden',
    position: 'relative', maxWidth: 200,
  },
  gifPreviewImage: { width: '100%', height: 120 },
  gifRemoveBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
});

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.xl, paddingTop: spacing.xxl + 10,
    backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSecondary, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: {
    flex: 1, paddingVertical: spacing.sm, fontSize: 15, color: colors.text,
  },
  list: { padding: spacing.sm },
  row: { gap: spacing.sm },
  gifItem: {
    flex: 1, margin: 2, borderRadius: borderRadius.md, overflow: 'hidden',
    maxWidth: '48%',
  },
  gifImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.bgTertiary },
});
