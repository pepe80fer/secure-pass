import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EntryCard } from '@/ui/components/EntryCard';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';
import { colors, radius, spacing } from '@/ui/theme/theme';
import { listCategories, useEntries } from '@/vault/vaultStore';

const ALL_CATEGORIES = '__all__';

export default function VaultList() {
  const entries = useEntries();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);

  const categories = useMemo(() => listCategories(entries), [entries]);

  const visibleEntries = useMemo(() => {
    const filtered =
      selectedCategory === ALL_CATEGORIES ? entries : entries.filter((entry) => entry.category === selectedCategory);
    return [...filtered].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });
  }, [entries, selectedCategory]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Mis contraseñas</ThemedText>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/(vault)/settings')} hitSlop={8} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => router.push('/(vault)/entry/new')} hitSlop={8} style={styles.addButton}>
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {categories.length > 0 && (
        <FlatList
          horizontal
          data={[ALL_CATEGORIES, ...categories]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          style={styles.chipList}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedCategory(item)}
              style={[styles.chip, selectedCategory === item && styles.chipSelected]}
            >
              <ThemedText type="small" colorToken={selectedCategory === item ? 'text' : 'textSecondary'}>
                {item === ALL_CATEGORIES ? 'Todas' : item}
              </ThemedText>
            </Pressable>
          )}
        />
      )}

      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText colorToken="textSecondary" style={styles.emptyText}>
            Todavía no tienes contraseñas guardadas.
          </ThemedText>
          <Pressable onPress={() => router.push('/(vault)/entry/new')}>
            <ThemedText colorToken="accent">Agregar la primera</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <EntryCard entry={item} onPress={() => router.push(`/(vault)/entry/${item.id}`)} />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.four },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.three,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.two },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipList: { flexGrow: 0, marginBottom: spacing.three },
  chipRow: { gap: spacing.two },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.one,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  list: { paddingBottom: spacing.six },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.two },
  emptyText: { textAlign: 'center' },
});
