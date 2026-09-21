import {
  crypto_aead_xchacha20poly1305_ietf_decrypt,
  crypto_aead_xchacha20poly1305_ietf_encrypt,
  crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
  from_base64,
  randombytes_buf,
  to_base64,
} from 'react-native-libsodium';

/**
 * Cifrado/descifrado autenticado (XChaCha20-Poly1305) del blob completo del
 * vault. Ver plan.md, secciones 1 y 3. Cualquier manipulación del ciphertext,
 * el nonce, o un intento de descifrar con la llave equivocada hace fallar
 * `decryptVault` (la verificación de integridad es parte del propio cifrado).
 */

// Ata el ciphertext a esta app/versión de esquema; un vault.enc de otra
// versión o app no descifra aunque la llave sea correcta.
const ADDITIONAL_DATA = 'secure-pass:vault:v1';

export type EncryptedVault = {
  ciphertext: string; // base64
  nonce: string; // base64
};

export function encryptVault(plaintext: string, vaultKey: Uint8Array): EncryptedVault {
  const nonce = randombytes_buf(crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    ADDITIONAL_DATA,
    null,
    nonce,
    vaultKey,
    'base64'
  );
  return { ciphertext, nonce: to_base64(nonce) };
}

export function decryptVault(blob: EncryptedVault, vaultKey: Uint8Array): string {
  try {
    return crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      from_base64(blob.ciphertext),
      ADDITIONAL_DATA,
      from_base64(blob.nonce),
      vaultKey,
      'text'
    );
  } catch {
    throw new Error('No se pudo descifrar el vault: contraseña incorrecta o datos corruptos.');
  }
}
