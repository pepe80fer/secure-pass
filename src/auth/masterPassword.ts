import {
  computeKeyVerifier,
  defaultKdfParams,
  deriveVaultKey,
  generateKdfSalt,
  verifyVaultKey,
} from '@/crypto/keyDerivation';
import { encryptVault } from '@/crypto/vaultCipher';
import { readVaultMeta, vaultExists, writeEncryptedVaultBlob, writeVaultMeta } from '@/vault/vaultRepository';
import type { VaultMeta } from '@/vault/types';

/**
 * Creación y validación de la contraseña maestra. La contraseña nunca se
 * guarda — solo se usa para derivar la llave del vault (Argon2id) y, al
 * crearlo, para cifrar un vault vacío inicial. Ver plan.md, secciones 1 y 3.
 */

export const DEFAULT_AUTO_LOCK_MINUTES = 5;
export const MIN_MASTER_PASSWORD_LENGTH = 10;

export type PasswordStrength = 'weak' | 'fair' | 'strong';

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const varietyCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) =>
    pattern.test(password)
  ).length;

  if (password.length >= 16 && varietyCount >= 3) {
    return 'strong';
  }
  if (password.length >= MIN_MASTER_PASSWORD_LENGTH && varietyCount >= 2) {
    return 'fair';
  }
  return 'weak';
}

export class VaultAlreadyExistsError extends Error {}
export class NoVaultConfiguredError extends Error {}
export class InvalidMasterPasswordError extends Error {}

/** Crea el vault por primera vez. Devuelve la llave ya lista para la sesión. */
export function createMasterPassword(password: string): Uint8Array {
  if (vaultExists()) {
    throw new VaultAlreadyExistsError('Ya existe un vault configurado en este dispositivo.');
  }
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    throw new Error(`La contraseña maestra debe tener al menos ${MIN_MASTER_PASSWORD_LENGTH} caracteres.`);
  }

  const kdfSalt = generateKdfSalt();
  const kdfParams = defaultKdfParams();
  const vaultKey = deriveVaultKey(password, kdfSalt, kdfParams);
  const verifierHash = computeKeyVerifier(vaultKey);

  const meta: VaultMeta = {
    kdfSalt,
    kdfParams,
    verifierHash,
    autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
    biometricEnabled: false,
  };

  writeVaultMeta(meta);
  writeEncryptedVaultBlob(encryptVault(JSON.stringify([]), vaultKey));

  return vaultKey;
}

/** Valida la contraseña maestra contra el verificador guardado y deriva la llave. */
export function unlockWithMasterPassword(password: string): { vaultKey: Uint8Array; meta: VaultMeta } {
  const meta = readVaultMeta();
  if (!meta) {
    throw new NoVaultConfiguredError('No hay un vault configurado todavía.');
  }

  const vaultKey = deriveVaultKey(password, meta.kdfSalt, meta.kdfParams);
  if (!verifyVaultKey(vaultKey, meta.verifierHash)) {
    throw new InvalidMasterPasswordError('Contraseña incorrecta.');
  }

  return { vaultKey, meta };
}
