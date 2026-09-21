import * as SecureStore from 'expo-secure-store';
import { from_base64, to_base64 } from 'react-native-libsodium';

/**
 * Envoltura de la llave del vault protegida por Keychain (iOS) / Keystore
 * (Android), liberable solo mediante biometría del sistema operativo. La
 * contraseña maestra sigue siendo la única forma de recuperar el acceso si
 * la biometría falla o se invalida (ej. huellas reconfiguradas). Ver plan.md.
 */

const VAULT_KEY_ENTRY = 'secure-pass.vaultKey';

/** true si el dispositivo soporta guardar un valor protegido por biometría. */
export function isBiometricUnlockAvailable(): boolean {
  return SecureStore.canUseBiometricAuthentication();
}

export async function storeVaultKeyForBiometricUnlock(vaultKey: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(VAULT_KEY_ENTRY, to_base64(vaultKey), {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Dispara el prompt biométrico del SO y devuelve la llave si el usuario se
 * autentica correctamente. Devuelve `null` si nunca se guardó una llave
 * (ej. biometría deshabilitada) — nunca silencia un fallo de autenticación,
 * que se propaga como excepción para que la UI pida la contraseña maestra.
 */
export async function retrieveVaultKeyWithBiometrics(promptMessage: string): Promise<Uint8Array | null> {
  const value = await SecureStore.getItemAsync(VAULT_KEY_ENTRY, {
    requireAuthentication: true,
    authenticationPrompt: promptMessage,
  });
  return value ? from_base64(value) : null;
}

export async function clearBiometricVaultKey(): Promise<void> {
  await SecureStore.deleteItemAsync(VAULT_KEY_ENTRY);
}
