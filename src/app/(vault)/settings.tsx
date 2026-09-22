import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import {
  changeMasterPassword,
  evaluatePasswordStrength,
  MIN_MASTER_PASSWORD_LENGTH,
  type PasswordStrength,
} from '@/auth/masterPassword';
import { getVaultKey, lock, setAutoLockMinutes, unlock } from '@/auth/session';
import { clearBiometricVaultKey, isBiometricUnlockAvailable, storeVaultKeyForBiometricUnlock } from '@/crypto/secureKeyStore';
import { Button } from '@/ui/components/Button';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TextField } from '@/ui/components/TextField';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';
import { colors, radius, spacing } from '@/ui/theme/theme';
import { readVaultMeta, writeVaultMeta } from '@/vault/vaultRepository';
import type { VaultMeta } from '@/vault/types';

const AUTO_LOCK_OPTIONS = [1, 5, 15, 30];

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Débil',
  fair: 'Aceptable',
  strong: 'Fuerte',
};

export default function Settings() {
  const [meta, setMeta] = useState<VaultMeta | null>(() => readVaultMeta());
  const biometricAvailable = isBiometricUnlockAvailable();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  if (!meta) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title="Ajustes" />
        <ThemedText colorToken="textSecondary" style={styles.emptyText}>
          No hay un vault configurado.
        </ThemedText>
      </ThemedView>
    );
  }

  function handleSelectAutoLock(minutes: number) {
    if (!meta) return;
    const updated: VaultMeta = { ...meta, autoLockMinutes: minutes };
    writeVaultMeta(updated);
    setAutoLockMinutes(minutes);
    setMeta(updated);
  }

  async function handleToggleBiometric(enable: boolean) {
    if (!meta) return;
    if (enable) {
      const key = getVaultKey();
      if (!key) return;
      try {
        await storeVaultKeyForBiometricUnlock(key);
        const updated: VaultMeta = { ...meta, biometricEnabled: true };
        writeVaultMeta(updated);
        setMeta(updated);
      } catch {
        Alert.alert('No se pudo activar la biometría', 'Inténtalo de nuevo.');
      }
    } else {
      await clearBiometricVaultKey();
      const updated: VaultMeta = { ...meta, biometricEnabled: false };
      writeVaultMeta(updated);
      setMeta(updated);
    }
  }

  const newPasswordStrength = evaluatePasswordStrength(newPassword);
  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_MASTER_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    !changingPassword;

  function handleChangePassword() {
    if (!canChangePassword || !meta) return;
    setPasswordError(null);
    setChangingPassword(true);
    const wasBiometricEnabled = meta.biometricEnabled;
    // setTimeout deja pintar el spinner antes de que Argon2id bloquee el
    // hilo de JS de forma síncrona (se deriva una llave nueva).
    setTimeout(() => {
      try {
        const { vaultKey, meta: newMeta } = changeMasterPassword(currentPassword, newPassword);
        unlock(vaultKey, newMeta.autoLockMinutes);
        setMeta(newMeta);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangingPassword(false);
        Alert.alert('Contraseña actualizada', 'Tu contraseña maestra se cambió correctamente.');

        if (wasBiometricEnabled) {
          storeVaultKeyForBiometricUnlock(vaultKey)
            .then(() => setMeta((prev) => (prev ? { ...prev, biometricEnabled: true } : prev)))
            .catch(() => {
              writeVaultMeta({ ...newMeta, biometricEnabled: false });
              setMeta((prev) => (prev ? { ...prev, biometricEnabled: false } : prev));
              Alert.alert(
                'Biometría desactivada',
                'No se pudo volver a protegerla tras el cambio de contraseña. Puedes activarla de nuevo desde aquí.'
              );
            });
        }
      } catch (e) {
        setChangingPassword(false);
        setPasswordError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.');
      }
    }, 0);
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Ajustes" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <ThemedText type="subtitle">Bloqueo automático</ThemedText>
          <ThemedText type="small" colorToken="textSecondary">
            secure-pass se bloquea solo tras este tiempo de inactividad.
          </ThemedText>
          <View style={styles.chipRow}>
            {AUTO_LOCK_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => handleSelectAutoLock(minutes)}
                style={[styles.chip, meta.autoLockMinutes === minutes && styles.chipSelected]}
              >
                <ThemedText type="small" colorToken={meta.autoLockMinutes === minutes ? 'text' : 'textSecondary'}>
                  {minutes} min
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <ThemedText type="subtitle">Desbloqueo biométrico</ThemedText>
              <ThemedText type="small" colorToken="textSecondary">
                {biometricAvailable
                  ? 'Atajo local. Tu contraseña maestra siempre funciona como respaldo.'
                  : 'Tu dispositivo no tiene biometría configurada.'}
              </ThemedText>
            </View>
            <Switch
              value={meta.biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Button label="Bloquear ahora" variant="secondary" onPress={lock} />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Cambiar contraseña maestra</ThemedText>
          <TextField label="Contraseña actual" isPassword value={currentPassword} onChangeText={setCurrentPassword} />
          <View style={styles.field}>
            <TextField label="Nueva contraseña" isPassword value={newPassword} onChangeText={setNewPassword} />
            {newPassword.length > 0 && (
              <ThemedText
                type="small"
                colorToken={
                  newPasswordStrength === 'weak' ? 'danger' : newPasswordStrength === 'fair' ? 'textSecondary' : 'success'
                }
              >
                Fortaleza: {STRENGTH_LABEL[newPasswordStrength]}
              </ThemedText>
            )}
          </View>
          <TextField
            label="Confirmar nueva contraseña"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmPassword.length > 0 && confirmPassword !== newPassword ? 'Las contraseñas no coinciden' : undefined}
          />
          {passwordError && (
            <ThemedText type="small" colorToken="danger">
              {passwordError}
            </ThemedText>
          )}
          <Button
            label="Cambiar contraseña"
            onPress={handleChangePassword}
            loading={changingPassword}
            disabled={!canChangePassword}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: spacing.five, padding: spacing.four, paddingBottom: spacing.six },
  section: { gap: spacing.two },
  field: { gap: spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.one,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.three },
  switchLabel: { flex: 1, gap: 2 },
  emptyText: { paddingHorizontal: spacing.four },
});
