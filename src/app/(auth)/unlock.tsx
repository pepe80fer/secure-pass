import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { unlockWithMasterPassword } from '@/auth/masterPassword';
import { unlock } from '@/auth/session';
import { clearBiometricVaultKey, isBiometricUnlockAvailable, retrieveVaultKeyWithBiometrics } from '@/crypto/secureKeyStore';
import { Button } from '@/ui/components/Button';
import { TextField } from '@/ui/components/TextField';
import { ThemedText } from '@/ui/components/ThemedText';
import { ThemedView } from '@/ui/components/ThemedView';
import { spacing } from '@/ui/theme/theme';
import { readVaultMeta, writeVaultMeta } from '@/vault/vaultRepository';

export default function Unlock() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const meta = readVaultMeta();
  const canUseBiometrics = Boolean(meta?.biometricEnabled) && isBiometricUnlockAvailable();

  function goToVault() {
    router.replace('/(vault)');
  }

  function handleUnlockWithPassword() {
    if (!password || loading) {
      return;
    }
    setError(null);
    setLoading(true);
    // setTimeout deja que React pinte el spinner antes de que Argon2id
    // bloquee el hilo de JS de forma síncrona.
    setTimeout(() => {
      try {
        const { vaultKey, meta: currentMeta } = unlockWithMasterPassword(password);
        unlock(vaultKey, currentMeta.autoLockMinutes);
        goToVault();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo desbloquear.');
      } finally {
        setLoading(false);
      }
    }, 0);
  }

  async function handleUnlockWithBiometrics() {
    setError(null);
    try {
      const key = await retrieveVaultKeyWithBiometrics('Desbloquea secure-pass');
      if (!key) {
        // meta.biometricEnabled era true pero no hay nada que recuperar: en
        // Android esto es justo lo que pasa cuando el sistema invalidó la
        // llave (ej. se agregó/cambió una huella o rostro) — nunca va a
        // volver a funcionar sola, así que limpiamos en vez de dejar un
        // botón que siempre falla en silencio.
        await clearBiometricVaultKey();
        if (meta) {
          writeVaultMeta({ ...meta, biometricEnabled: false });
        }
        setError(
          'Tu acceso biométrico dejó de ser válido (por ejemplo, cambiaste tu huella o rostro en el sistema). Usa tu contraseña maestra; puedes reactivar la biometría después desde Ajustes.'
        );
        return;
      }
      if (meta) {
        unlock(key, meta.autoLockMinutes);
        goToVault();
      }
    } catch {
      setError('No se pudo verificar la biometría. Usa tu contraseña maestra.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title">secure-pass</ThemedText>
        <TextField
          label="Contraseña maestra"
          isPassword
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleUnlockWithPassword}
          returnKeyType="go"
        />
        {error && (
          <ThemedText colorToken="danger" type="small">
            {error}
          </ThemedText>
        )}
        <View style={styles.buttonGroup}>
          <Button label="Desbloquear" onPress={handleUnlockWithPassword} loading={loading} disabled={!password} />
          {canUseBiometrics && (
            <Button label="Usar biometría" variant="secondary" onPress={handleUnlockWithBiometrics} />
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.three,
    padding: spacing.four,
  },
  buttonGroup: { gap: spacing.two },
});
