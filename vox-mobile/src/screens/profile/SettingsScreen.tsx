// Vox Mobile — Settings Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Wifi, Check, RefreshCw, Palette, Moon, Sun, Shield } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { API_BASE, setApiBase, PRIVACY_POLICY_URL } from '../../api/client';
import { setItem } from '../../utils/storage';
import { useSocketStore } from '../../stores/socketStore';
import { useThemeStore } from '../../stores/themeStore';

export function SettingsScreen() {
  const navigation = useNavigation();
  const [serverUrl, setServerUrl] = useState(API_BASE);
  const [saved, setSaved] = useState(false);
  const disconnectSocket = useSocketStore(s => s.disconnect);
  const connectSocket = useSocketStore(s => s.connect);
  const { theme, currentId, setTheme, availableThemes } = useThemeStore();

  const handleSave = async () => {
    const url = serverUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Server URL must start with http:// or https://');
      return;
    }
    try {
      new URL(url);
    } catch {
      Alert.alert('Invalid URL', 'Please enter a valid server URL (e.g. http://192.168.2.4:4000)');
      return;
    }

    try {
      // Persist and update the API base
      await setItem('api_base', url);
      await setApiBase(url);

      // Reconnect socket with the new URL
      disconnectSocket();
      connectSocket();

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert('Error', 'Failed to update server URL. Please restart the app.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Theme */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>
          <View style={styles.themeGrid}>
            {availableThemes.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.themeCard,
                  currentId === t.id && styles.themeCardActive,
                  { backgroundColor: t.bg },
                ]}
                onPress={() => setTheme(t.id)}
              >
                {currentId === t.id && (
                  <Check size={16} color={colors.white} style={{ position: 'absolute', top: 6, right: 6 }} />
                )}
                <View style={styles.themePreview}>
                  <View style={[styles.themePreviewBar, { backgroundColor: t.bgSecondary }]} />
                  <View style={[styles.themePreviewAccent, { backgroundColor: t.accent }]} />
                </View>
                <Text style={[styles.themeLabel, { color: t.text }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Server URL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wifi size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Server Connection</Text>
          </View>

          <Text style={styles.label}>Backend Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.100:4000"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            The IP address of your VOX backend server. Make sure your phone is on the same WiFi network.
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
            onPress={handleSave}
          >
            {saved ? (
              <>
                <Check size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Saved!</Text>
              </>
            ) : (
              <>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Update & Reconnect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How to find your server IP:</Text>
          <Text style={styles.infoText}>1. Open Command Prompt on your PC</Text>
          <Text style={styles.infoText}>2. Type: ipconfig</Text>
          <Text style={styles.infoText}>3. Look for "IPv4 Address" under WiFi</Text>
          <Text style={styles.infoText}>4. Use that IP with port 4000</Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.infoLink}>Open WiFi Settings →</Text>
          </TouchableOpacity>
        </View>

        {/* Current */}
        <View style={styles.currentBox}>
          <Text style={styles.currentLabel}>Current server:</Text>
          <Text style={styles.currentUrl}>{API_BASE}</Text>
        </View>
      </ScrollView>
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
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  saveBtnSuccess: {
    backgroundColor: '#2ecc71',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  linkLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  linkChevron: {
    color: colors.textMuted,
    fontSize: 22,
  },
  infoBox: {
    margin: spacing.xl,
    marginTop: 0,
    padding: spacing.lg,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 20,
  },
  infoLink: {
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  themeCard: {
    width: '45%',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  themeCardActive: {
    borderColor: colors.accent,
  },
  themePreview: {
    height: 60,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  themePreviewBar: {
    height: '70%',
  },
  themePreviewAccent: {
    height: '30%',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  currentBox: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
  },
  currentLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  currentUrl: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontFamily: 'monospace',
  },
});
