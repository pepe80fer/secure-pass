import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';

import { Button } from '@/ui/components/Button';
import { CopyButton } from '@/ui/components/CopyButton';
import { TextField } from '@/ui/components/TextField';
import { ThemedText } from '@/ui/components/ThemedText';
import { radius, spacing, colors } from '@/ui/theme/theme';

export type EntryFormValues = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
  isFavorite: boolean;
};

type EntryFormProps = {
  initialValues: EntryFormValues;
  submitLabel: string;
  onSubmit: (values: EntryFormValues) => void;
  /** Solo en modo edición: muestra los botones "Copiar" junto a usuario/contraseña. */
  showCopyButtons?: boolean;
  onDelete?: () => void;
  knownCategories?: string[];
};

/** Formulario compartido por (vault)/entry/new.tsx y (vault)/entry/[id].tsx. */
export function EntryForm({
  initialValues,
  submitLabel,
  onSubmit,
  showCopyButtons,
  onDelete,
  knownCategories,
}: EntryFormProps) {
  const [values, setValues] = useState(initialValues);
  const canSave = values.title.trim().length > 0 && values.password.length > 0;

  function set<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField
        label="Sitio o app"
        value={values.title}
        onChangeText={(text) => set('title', text)}
        placeholder="Ej. Banco, Gmail..."
      />

      <FieldWithCopy
        label="Usuario o correo"
        value={values.username}
        onChangeText={(text) => set('username', text)}
        copyValue={showCopyButtons ? values.username : undefined}
      />

      <FieldWithCopy
        label="Contraseña"
        value={values.password}
        onChangeText={(text) => set('password', text)}
        isPassword
        copyValue={showCopyButtons ? values.password : undefined}
      />

      <TextField
        label="URL (opcional)"
        value={values.url}
        onChangeText={(text) => set('url', text)}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://..."
      />

      <View style={styles.field}>
        <TextField
          label="Categoría (opcional)"
          value={values.category}
          onChangeText={(text) => set('category', text)}
          placeholder="Ej. Trabajo, Banco..."
        />
        {knownCategories && knownCategories.length > 0 && (
          <View style={styles.chipRow}>
            {knownCategories.map((category) => (
              <Pressable key={category} onPress={() => set('category', category)} style={styles.chip}>
                <ThemedText type="small" colorToken="textSecondary">
                  {category}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <TextField
        label="Notas (opcional)"
        value={values.notes}
        onChangeText={(text) => set('notes', text)}
        multiline
        style={styles.notesInput}
      />

      <Pressable style={styles.favoriteRow} onPress={() => set('isFavorite', !values.isFavorite)}>
        <ThemedText type="small" colorToken={values.isFavorite ? 'accent' : 'textSecondary'}>
          {values.isFavorite ? '★ Favorito' : '☆ Marcar como favorito'}
        </ThemedText>
      </Pressable>

      <Button label={submitLabel} onPress={() => onSubmit(values)} disabled={!canSave} />
      {onDelete && <Button label="Eliminar entrada" variant="secondary" onPress={onDelete} />}
    </ScrollView>
  );
}

type FieldWithCopyProps = TextInputProps & {
  label: string;
  isPassword?: boolean;
  /** Si se pasa (no vacío), muestra el botón de copiar para este valor. */
  copyValue?: string;
};

function FieldWithCopy({ copyValue, ...rest }: FieldWithCopyProps) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldGrow}>
        <TextField {...rest} />
      </View>
      {copyValue !== undefined && (
        <View style={styles.copyButtonWrapper}>
          <CopyButton value={copyValue} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.three,
    padding: spacing.four,
  },
  field: { gap: spacing.two },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.two },
  fieldGrow: { flex: 1 },
  copyButtonWrapper: { paddingBottom: spacing.three },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  favoriteRow: { paddingVertical: spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.one },
  chip: {
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.one,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
