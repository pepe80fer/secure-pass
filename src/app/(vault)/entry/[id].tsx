import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button } from '@/ui/components/Button';
import { EntryForm } from '@/ui/components/EntryForm';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';
import { spacing } from '@/ui/theme/theme';
import { deleteEntry, listCategories, updateEntry, useEntries } from '@/vault/vaultStore';

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useEntries();
  const entry = entries.find((item) => item.id === id);
  const knownCategories = useMemo(
    () => listCategories(entries).filter((category) => category !== entry?.category),
    [entries, entry?.category]
  );

  if (!entry) {
    return (
      <ThemedView style={styles.notFound}>
        <ThemedText type="title">Entrada no encontrada</ThemedText>
        <ThemedText colorToken="textSecondary" style={styles.notFoundText}>
          Puede que ya se haya eliminado.
        </ThemedText>
        <Button label="Volver" variant="secondary" onPress={() => router.back()} style={styles.notFoundButton} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScreenHeader title={entry.title} />
      <EntryForm
        initialValues={{
          title: entry.title,
          username: entry.username,
          password: entry.password,
          url: entry.url ?? '',
          notes: entry.notes ?? '',
          category: entry.category ?? '',
          isFavorite: entry.isFavorite,
        }}
        submitLabel="Guardar cambios"
        knownCategories={knownCategories}
        showCopyButtons
        onDelete={() => {
          Alert.alert('Eliminar entrada', `¿Eliminar "${entry.title}"? Esta acción no se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => {
                deleteEntry(entry.id);
                router.back();
              },
            },
          ]);
        }}
        onSubmit={(values) => {
          updateEntry(entry.id, values);
          router.back();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.two, padding: spacing.four },
  notFoundText: { textAlign: 'center' },
  notFoundButton: { marginTop: spacing.two },
});
