import * as SecureStore from 'expo-secure-store';
import { randombytes_buf, to_base64 } from 'react-native-libsodium';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  canUseBiometricAuthentication: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

import {
  clearBiometricVaultKey,
  isBiometricUnlockAvailable,
  retrieveVaultKeyWithBiometrics,
  storeVaultKeyForBiometricUnlock,
} from '@/crypto/secureKeyStore';

const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;
const canUseBiometricAuthentication = SecureStore.canUseBiometricAuthentication as jest.Mock;

const STORAGE_KEY = 'secure-pass.vaultKey';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('secureKeyStore', () => {
  it('isBiometricUnlockAvailable delega en SecureStore.canUseBiometricAuthentication', () => {
    canUseBiometricAuthentication.mockReturnValue(true);
    expect(isBiometricUnlockAvailable()).toBe(true);
    expect(canUseBiometricAuthentication).toHaveBeenCalledTimes(1);
  });

  it('guarda la llave codificada en base64, protegida por autenticación', async () => {
    const key = randombytes_buf(32) as Uint8Array;

    await storeVaultKeyForBiometricUnlock(key);

    expect(setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      to_base64(key),
      expect.objectContaining({
        requireAuthentication: true,
        keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      })
    );
  });

  it('recupera exactamente la misma llave que se guardó', async () => {
    const key = randombytes_buf(32) as Uint8Array;
    getItemAsync.mockResolvedValue(to_base64(key));

    const recovered = await retrieveVaultKeyWithBiometrics('Desbloquea secure-pass');

    expect(Array.from(recovered ?? [])).toEqual(Array.from(key));
    expect(getItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.objectContaining({ requireAuthentication: true, authenticationPrompt: 'Desbloquea secure-pass' })
    );
  });

  it('devuelve null si nunca se guardó una llave', async () => {
    getItemAsync.mockResolvedValue(null);
    await expect(retrieveVaultKeyWithBiometrics('prompt')).resolves.toBeNull();
  });

  it('no silencia un fallo de autenticación biométrica', async () => {
    getItemAsync.mockRejectedValue(new Error('User cancelled biometric prompt'));
    await expect(retrieveVaultKeyWithBiometrics('prompt')).rejects.toThrow('User cancelled biometric prompt');
  });

  it('borra la llave guardada', async () => {
    await clearBiometricVaultKey();
    expect(deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
