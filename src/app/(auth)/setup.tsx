import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  createMasterPassword,
  DEFAULT_AUTO_LOCK_MINUTES,
  evaluatePasswordStrength,
  MIN_MASTER_PASSWORD_LENGTH,
  type PasswordStrength,
} from '@/auth/masterPassword';
import { getVaultKey, unlock } from '@/auth/session';
import { isBiometricUnlockAvailable, storeVaultKeyForBiometricUnlock } from '@/crypto/secureKeyStore';
import { Button } from '@/ui/components/Button';
import { TextField } from '@/ui/components/TextField';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';
import { colors, spacing } from '@/ui/theme/theme';
import { readVaultMeta, writeVaultMeta } from '@/vault/vaultRepository';

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Débil',
  fair: 'Aceptable',
  strong: 'Fuerte',
};

const STRENGTH_COLOR: Record<PasswordStrength, keyof typeof colors> = {
  weak: 'danger',
  fair: 'textSecondary',
  strong: 'success',
};

export default function Setup() {
  const [step, setStep] = useState<'password' | 'biometrics'>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = evaluatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = password.length >= MIN_MASTER_PASSWORD_LENGTH && passwordsMatch && acknowledged && !loading;

  function handleCreate() {
    if (!canSubmit) {
      return;
    }
    setError(null);
    setLoading(true);
    // setTimeout deja que React pinte el spinner antes de que Argon2id
    // bloquee el hilo de JS de forma síncrona.
    setTimeout(() => {
      try {
        const vaultKey = createMasterPassword(password);
        unlock(vaultKey, DEFAULT_AUTO_LOCK_MINUTES);
        setLoading(false);
        setStep(isBiometricUnlockAvailable() ? 'biometrics' : 'password');
        if (!isBiometricUnlockAvailable()) {
          router.replace('/(vault)');
        }
      } catch (e) {
        setLoading(false);
        setError(e instanceof Error ? e.message : 'No se pudo crear el vault.');
      }
    }, 0);
  }

  async function handleEnableBiometrics(enable: boolean) {
    if (enable) {
      const key = getVaultKey();
      const meta = readVaultMeta();
      if (key && meta) {
        try {
          await storeVaultKeyForBiometricUnlock(key);
          writeVaultMeta({ ...meta, biometricEnabled: true });
        } catch {
          Alert.alert('No se pudo activar la biometría', 'Puedes intentarlo de nuevo después desde Ajustes.');
        }
      }
    }
    router.replace('/(vault)');
  }

  if (step === 'biometrics') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="title">Desbloqueo rápido</ThemedText>
          <ThemedText colorToken="textSecondary">
            ¿Quieres usar tu huella o rostro para desbloquear secure-pass? Tu contraseña maestra
            sigue funcionando siempre como respaldo si la biometría falla.
          </ThemedText>
          <View style={styles.buttonGroup}>
            <Button label="Activar biometría" onPress={() => handleEnableBiometrics(true)} />
            <Button label="Ahora no" variant="secondary" onPress={() => handleEnableBiometrics(false)} />
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Crea tu contraseña maestra</ThemedText>
        <ThemedText colorToken="textSecondary">
          Es la única llave de tu vault. secure-pass no la guarda en ningún lado: si la olvidas,
          tus contraseñas no se pueden recuperar.
        </ThemedText>

        <View style={styles.field}>
          <TextField
            label="Contraseña maestra"
            isPassword
            value={password}
            onChangeText={setPassword}
            placeholder={`Mínimo ${MIN_MASTER_PASSWORD_LENGTH} caracteres`}
          />
          {password.length > 0 && (
            <ThemedText type="small" colorToken={STRENGTH_COLOR[strength]}>
              Fortaleza: {STRENGTH_LABEL[strength]}
            </ThemedText>
          )}
        </View>

        <TextField
          label="Confirmar contraseña"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={confirmPassword.length > 0 && !passwordsMatch ? 'Las contraseñas no coinciden' : undefined}
        />

        <Pressable style={styles.checkboxRow} onPress={() => setAcknowledged((prev) => !prev)}>
          <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]} />
          <ThemedText type="small" colorToken="textSecondary" style={styles.checkboxLabel}>
            Entiendo que si olvido esta contraseña, mis datos quedarán cifrados para siempre y no
            hay forma de recuperarlos.
          </ThemedText>
        </Pressable>

        {error && (
          <ThemedText colorToken="danger" type="small">
            {error}
          </ThemedText>
        )}

        <Button label="Crear vault" onPress={handleCreate} loading={loading} disabled={!canSubmit} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.three,
    padding: spacing.four,
  },
  field: { gap: spacing.one },
  buttonGroup: { gap: spacing.two },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxLabel: { flex: 1 },
});
