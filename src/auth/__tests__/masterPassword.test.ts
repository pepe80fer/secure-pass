import * as FileSystemMock from 'expo-file-system';

import {
  createMasterPassword,
  evaluatePasswordStrength,
  InvalidMasterPasswordError,
  MIN_MASTER_PASSWORD_LENGTH,
  NoVaultConfiguredError,
  unlockWithMasterPassword,
  VaultAlreadyExistsError,
} from '@/auth/masterPassword';
import { readVaultMeta } from '@/vault/vaultRepository';

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
