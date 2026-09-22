import * as FileSystemMock from 'expo-file-system';

import {
  changeMasterPassword,
  createMasterPassword,
  evaluatePasswordStrength,
  InvalidMasterPasswordError,
  MIN_MASTER_PASSWORD_LENGTH,
  NoVaultConfiguredError,
  unlockWithMasterPassword,
  VaultAlreadyExistsError,
} from '@/auth/masterPassword';
import { decryptVault, encryptVault } from '@/crypto/vaultCipher';
import { readEncryptedVaultBlob, readVaultMeta, writeEncryptedVaultBlob } from '@/vault/vaultRepository';

// El mock en __mocks__/expo-file-system.ts expone este helper solo para
// tests; no existe en el tipo real del paquete, de ahí el cast.
const { __resetMockFileSystem } = FileSystemMock as unknown as { __resetMockFileSystem: () => void };

beforeEach(() => {
  __resetMockFileSystem();
});

describe('createMasterPassword', () => {
  it('rechaza contraseñas más cortas que el mínimo', () => {
    expect(() => createMasterPassword('corta')).toThrow(
      `${MIN_MASTER_PASSWORD_LENGTH} caracteres`
    );
  });

  it('crea el vault y deja una entrada de meta consistente', () => {
    createMasterPassword('correct horse battery staple');

    const meta = readVaultMeta();
    expect(meta).not.toBeNull();
    expect(meta?.biometricEnabled).toBe(false);
    expect(meta?.autoLockMinutes).toBe(5);
    expect(typeof meta?.kdfSalt).toBe('string');
    expect(typeof meta?.verifierHash).toBe('string');
  });

  it('no permite crear un segundo vault sobre uno existente', () => {
    createMasterPassword('correct horse battery staple');
    expect(() => createMasterPassword('otra-contraseña-larga')).toThrow(VaultAlreadyExistsError);
  });
});

describe('unlockWithMasterPassword', () => {
  it('falla si todavía no existe un vault', () => {
    expect(() => unlockWithMasterPassword('lo que sea')).toThrow(NoVaultConfiguredError);
  });

  it('desbloquea con la contraseña correcta y devuelve la misma llave creada', () => {
    const createdKey = createMasterPassword('correct horse battery staple');
    const { vaultKey } = unlockWithMasterPassword('correct horse battery staple');
    expect(Array.from(vaultKey)).toEqual(Array.from(createdKey));
  });

  it('rechaza la contraseña incorrecta', () => {
    createMasterPassword('correct horse battery staple');
    expect(() => unlockWithMasterPassword('contraseña-equivocada')).toThrow(InvalidMasterPasswordError);
  });
});

describe('changeMasterPassword', () => {
  it('falla si todavía no existe un vault', () => {
    expect(() => changeMasterPassword('a', 'una-nueva-contraseña-larga')).toThrow(NoVaultConfiguredError);
  });

  it('rechaza si la contraseña actual es incorrecta', () => {
    createMasterPassword('correct horse battery staple');
    expect(() => changeMasterPassword('contraseña-equivocada', 'una-nueva-contraseña-larga')).toThrow(
      InvalidMasterPasswordError
    );
  });

  it('rechaza una contraseña nueva más corta que el mínimo', () => {
    createMasterPassword('correct horse battery staple');
    expect(() => changeMasterPassword('correct horse battery staple', 'corta')).toThrow(
      `${MIN_MASTER_PASSWORD_LENGTH} caracteres`
    );
  });

  it('la contraseña anterior deja de servir y la nueva sí', () => {
    createMasterPassword('correct horse battery staple');
    changeMasterPassword('correct horse battery staple', 'una-nueva-contraseña-larga');

    expect(() => unlockWithMasterPassword('correct horse battery staple')).toThrow(InvalidMasterPasswordError);
    expect(() => unlockWithMasterPassword('una-nueva-contraseña-larga')).not.toThrow();
  });

  it('preserva las entradas existentes, re-cifradas con la llave nueva', () => {
    const oldKey = createMasterPassword('correct horse battery staple');
    const originalContent = JSON.stringify([{ id: '1', title: 'Banco' }]);
    writeEncryptedVaultBlob(encryptVault(originalContent, oldKey));

    const { vaultKey: newKey } = changeMasterPassword('correct horse battery staple', 'una-nueva-contraseña-larga');

    const blob = readEncryptedVaultBlob();
    expect(blob).not.toBeNull();
    expect(decryptVault(blob!, newKey)).toBe(originalContent);
  });

  it('genera un salt nuevo (re-deriva la llave por completo, no solo la envuelve)', () => {
    createMasterPassword('correct horse battery staple');
    const saltBefore = readVaultMeta()?.kdfSalt;

    changeMasterPassword('correct horse battery staple', 'una-nueva-contraseña-larga');

    expect(readVaultMeta()?.kdfSalt).not.toBe(saltBefore);
  });
});

describe('evaluatePasswordStrength', () => {
  it('clasifica una contraseña corta o simple como débil', () => {
    expect(evaluatePasswordStrength('abc')).toBe('weak');
    expect(evaluatePasswordStrength('abcdefghijklmno')).toBe('weak');
  });

  it('clasifica una contraseña de longitud mínima con variedad como aceptable', () => {
    expect(evaluatePasswordStrength('abcdefgh12')).toBe('fair');
  });

  it('clasifica una contraseña larga y variada como fuerte', () => {
    expect(evaluatePasswordStrength('Correct-Horse-Battery-9')).toBe('strong');
  });
});
