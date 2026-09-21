import * as FileSystemMock from 'expo-file-system';

import {
  readEncryptedVaultBlob,
  readVaultMeta,
  vaultExists,
  writeEncryptedVaultBlob,
  writeVaultMeta,
} from '@/vault/vaultRepository';
import type { VaultMeta } from '@/vault/types';

const SAMPLE_META: VaultMeta = {
  kdfSalt: 'c2FsdA',
  kdfParams: { opsLimit: 3, memLimitKb: 262144 },
  verifierHash: 'dmVyaWZpZXI',
  autoLockMinutes: 5,
  biometricEnabled: false,
};

// El mock en __mocks__/expo-file-system.ts expone este helper solo para
// tests; no existe en el tipo real del paquete, de ahí el cast.
const { __resetMockFileSystem } = FileSystemMock as unknown as { __resetMockFileSystem: () => void };

beforeEach(() => {
  __resetMockFileSystem();
});

describe('vaultRepository', () => {
  it('no reporta un vault existente hasta que se escribe meta', () => {
    expect(vaultExists()).toBe(false);
    writeVaultMeta(SAMPLE_META);
    expect(vaultExists()).toBe(true);
  });

  it('devuelve null cuando todavía no hay meta ni blob guardados', () => {
    expect(readVaultMeta()).toBeNull();
    expect(readEncryptedVaultBlob()).toBeNull();
  });

  it('lee exactamente el meta que se escribió', () => {
    writeVaultMeta(SAMPLE_META);
    expect(readVaultMeta()).toEqual(SAMPLE_META);
  });

  it('permite actualizar un meta ya existente (ej. activar biometría después)', () => {
    writeVaultMeta(SAMPLE_META);
    writeVaultMeta({ ...SAMPLE_META, biometricEnabled: true });
    expect(readVaultMeta()).toEqual({ ...SAMPLE_META, biometricEnabled: true });
  });

  it('lee exactamente el blob cifrado que se escribió', () => {
    const blob = { ciphertext: 'Y2lwaGVy', nonce: 'bm9uY2U' };
    writeEncryptedVaultBlob(blob);
    expect(readEncryptedVaultBlob()).toEqual(blob);
  });

  it('guarda el meta y el blob en archivos separados', () => {
    const blob = { ciphertext: 'Y2lwaGVy', nonce: 'bm9uY2U' };
    writeVaultMeta(SAMPLE_META);
    writeEncryptedVaultBlob(blob);

    expect(readVaultMeta()).toEqual(SAMPLE_META);
    expect(readEncryptedVaultBlob()).toEqual(blob);
  });
});
