import {
  crypto_generichash,
  crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13,
  crypto_pwhash_SALTBYTES,
  from_base64,
  randombytes_buf,
} from 'react-native-libsodium';

/**
 * Derivación de la llave del vault a partir de la contraseña maestra (Argon2id)
 * y verificación de contraseña sin guardar la contraseña ni la llave. Ver plan.md, secciones 1 y 3.
 */

export const VAULT_KEY_BYTES = 32;

// Costos "moderate" de Argon2id publicados por libsodium. react-native-libsodium
// solo expone las constantes *_INTERACTIVE de forma nativa, así que los valores
// MODERATE (más apropiados para derivar una llave secreta, no solo un login) se
// fijan aquí explícitamente: https://libsodium.gitbook.io/doc/password_hashing/default_phf
const OPSLIMIT_MODERATE = 3;
const MEMLIMIT_MODERATE_BYTES = 268435456; // 256 MiB

const VERIFIER_LABEL = 'secure-pass:key-verifier:v1';
const VERIFIER_BYTES = 32;

export type KdfParams = {
  opsLimit: number;
  memLimitKb: number;
};

export function defaultKdfParams(): KdfParams {
  return { opsLimit: OPSLIMIT_MODERATE, memLimitKb: MEMLIMIT_MODERATE_BYTES / 1024 };
}

/** Salt aleatorio único por vault, para persistir en VaultMeta.kdfSalt (no es secreto). */
export function generateKdfSalt(): string {
  return randombytes_buf(crypto_pwhash_SALTBYTES, 'base64');
}

/** Deriva la llave de cifrado del vault. Costosa a propósito (Argon2id). */
export function deriveVaultKey(password: string, saltBase64: string, params: KdfParams): Uint8Array {
  const salt = from_base64(saltBase64);
  return crypto_pwhash(
    VAULT_KEY_BYTES,
    password,
    salt,
    params.opsLimit,
    params.memLimitKb * 1024,
    crypto_pwhash_ALG_ARGON2ID13
  );
}

/**
 * Hash rápido de verificación (BLAKE2b keyed con la llave del vault como secreto),
 * para persistir en VaultMeta.verifierHash. Permite confirmar que la contraseña
 * maestra es correcta sin volver a ejecutar Argon2id y sin poder reconstruir la
 * llave a partir del propio hash.
 */
export function computeKeyVerifier(vaultKey: Uint8Array): string {
  return crypto_generichash(VERIFIER_BYTES, VERIFIER_LABEL, vaultKey, 'base64');
}

export function verifyVaultKey(vaultKey: Uint8Array, expectedVerifier: string): boolean {
  return constantTimeEqual(computeKeyVerifier(vaultKey), expectedVerifier);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
