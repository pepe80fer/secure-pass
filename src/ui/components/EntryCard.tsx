import { Pressable, StyleSheet, View } from 'react-native';

import { CopyButton } from '@/ui/components/CopyButton';
import { ThemedText } from '@/ui/components/ThemedText';
import { colors, radius, spacing } from '@/ui/theme/theme';
import type { VaultEntry } from '@/vault/types';

const AVATAR_COLORS = ['#5B8DEF', '#7C6FF0', '#3ECF8E', '#E0A83E', '#E5484D', '#36B3C2'];

function avatarColorFor(id: string): string {
  const sum = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

type EntryCardProps = {
  entry: VaultEntry;
  onPress: () => void;
};

export function EntryCard({ entry, onPress }: EntryCardProps) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatarColorFor(entry.id) }]}>
        <ThemedText type="smallBold" colorToken="text">
          {entry.title.charAt(0).toUpperCase() || '?'}
        </ThemedText>
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <ThemedText type="default" numberOfLines={1} style={styles.title}>
            {entry.title}
          </ThemedText>
          {entry.isFavorite && (
            <ThemedText type="small" colorToken="accent">
              ★
            </ThemedText>
          )}
        </View>
        {entry.username ? (
          <ThemedText type="small" colorToken="textSecondary" numberOfLines={1}>
            {entry.username}
          </ThemedText>
        ) : null}
      </View>

      <CopyButton value={entry.password} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    paddingVertical: spacing.three,
    paddingHorizontal: spacing.three,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    marginBottom: spacing.two,
  },
  cardPressed: { opacity: 0.8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.one },
  title: { flexShrink: 1 },
});
