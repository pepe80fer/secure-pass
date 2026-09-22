import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/ThemedText';
import { colors, spacing } from '@/ui/theme/theme';

type ScreenHeaderProps = {
  title: string;
};

/** Encabezado con botón de volver para pantallas dentro de un Stack sin header nativo. */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton} accessibilityLabel="Volver">
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <ThemedText type="subtitle" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.four,
    paddingTop: spacing.four,
    paddingBottom: spacing.two,
    gap: spacing.two,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  spacer: { width: 32 },
});
