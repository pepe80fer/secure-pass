import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { EntryForm } from '@/ui/components/EntryForm';
import { PlaceholderScreen } from '@/ui/components/PlaceholderScreen';
import { ThemedView } from '@/ui/components/ThemedView';
import { copyToClipboard } from '@/utils/clipboard';
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
    return <PlaceholderScreen title="Entrada no encontrada" phase="Puede que ya se haya eliminado." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
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
        onCopy={(value, label) => {
          void copyToClipboard(value);
          Alert.alert('Copiado', `${label} se copió y se borrará del portapapeles en unos segundos.`);
        }}
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
