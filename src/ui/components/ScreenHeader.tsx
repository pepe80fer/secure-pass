import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/ui/components/ThemedText';
import { colors, spacing } from '@/ui/theme/theme';

type ScreenHeaderProps = {
  title: string;
};

/** Encabezado con botón de volver para pantallas dentro de un Stack sin header nativo. */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.three }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton} accessibilityLabel="Volver">
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <ThemedText type="sectionTitle" numberOfLines={1} style={styles.title}>
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
    paddingBottom: spacing.three,
    gap: spacing.two,
    minHeight: 72,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  spacer: { width: 40 },
});
