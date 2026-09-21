import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { EntryForm } from '@/ui/components/EntryForm';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';
import { spacing } from '@/ui/theme/theme';
import { addEntry, listCategories, useEntries } from '@/vault/vaultStore';

export default function NewEntry() {
  const entries = useEntries();
  const knownCategories = useMemo(() => listCategories(entries), [entries]);
  const [error, setError] = useState<string | null>(null);

  return (
    <ThemedView style={{ flex: 1 }}>
      {error && (
        <ThemedText colorToken="danger" type="small" style={{ paddingHorizontal: spacing.four, paddingTop: spacing.three }}>
          {error}
        </ThemedText>
      )}
      <EntryForm
        initialValues={{
          title: '',
          username: '',
          password: '',
          url: '',
          notes: '',
          category: '',
          isFavorite: false,
        }}
        submitLabel="Guardar"
        knownCategories={knownCategories}
        onSubmit={(values) => {
          try {
            addEntry(values);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la entrada.');
          }
        }}
      />
    </ThemedView>
  );
}
