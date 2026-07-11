// Vox Mobile — Discover Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as serversApi from '../../api/servers';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Avatar } from '../../components/common/Avatar';
import { Search, Users, Join } from 'lucide-react-native';

export function DiscoverScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async (query?: string) => {
    setIsLoading(true);
    try {
      const result = await serversApi.discoverServers({ search: query, limit: 20 });
      setServers(result);
    } catch (err) {
      console.error('Failed to load servers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadServers(search.trim());
  };

  const handleJoin = async (serverId: string, serverName: string) => {
    try {
      await serversApi.joinServer(serverId);
      Alert.alert('Joined!', `You joined ${serverName}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not join server');
    }
  };

  const renderServer = ({ item }: { item: any }) => (
    <View style={styles.serverCard}>
      <Avatar uri={item.icon} name={item.name} size={48} />
      <View style={styles.serverInfo}>
        <Text style={styles.serverName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.serverDesc} numberOfLines={2}>{item.description || 'No description'}</Text>
        <View style={styles.meta}>
          <Users size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{item._count?.members || 0} members</Text>
        </View>
      </View>
      {!item.joined && (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => handleJoin(item.id, item.name)}
        >
          <Text style={styles.joinText}>Join</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search servers..."
          placeholderTextColor={colors.textDim}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Search size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={servers}
        keyExtractor={item => item.id}
        renderItem={renderServer}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading...' : 'No servers found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  serverDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  joinButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  joinText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
