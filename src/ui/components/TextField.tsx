import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/ui/components/ThemedText';
import { colors, radius, spacing } from '@/ui/theme/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  isPassword?: boolean;
};

export function TextField({ label, error, isPassword, style, ...rest }: TextFieldProps) {
  const [isSecure, setIsSecure] = useState(Boolean(isPassword));

  return (
    <View style={styles.container}>
      <ThemedText type="small" colorToken="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setIsSecure((prev) => !prev)}
            hitSlop={8}
            accessibilityLabel={isSecure ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons name={isSecure ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {error ? (
        <ThemedText type="small" colorToken="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.one, width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.three,
    gap: spacing.two,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.three,
  },
});
