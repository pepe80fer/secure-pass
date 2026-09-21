import { StyleSheet } from 'react-native';

import { spacing } from '@/ui/theme/theme';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';

type PlaceholderScreenProps = {
  title: string;
  phase: string;
};

/** Marcador de posición de navegación. Cada fase reemplaza su pantalla correspondiente. */
export function PlaceholderScreen({ title, phase }: PlaceholderScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText type="small" colorToken="textSecondary">
        {phase}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.two,
    padding: spacing.four,
  },
});
