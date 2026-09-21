/**
 * Mock de Jest para react-native-libsodium.
 *
 * react-native-libsodium expone Argon2id/XChaCha20-Poly1305 vía un binding
 * nativo (JSI) que no existe corriendo bajo Jest/Node. En vez de simular el
 * resultado (lo que dejaría sin probar la criptografía real), este mock
 * redirige las mismas llamadas a `libsodium-wrappers-sumo` (implementación
 * WASM de la misma librería, usada también por este paquete para su target
 * web). Los tests en src/crypto/__tests__ corren cifrado/descifrado y
 * derivación de llaves reales, no un doble de prueba.
 *
 * Requiere que `sodium.ready` ya se haya resuelto — ver jest.setup.ts.
 */
import sodium from 'libsodium-wrappers-sumo';

type OutputFormat = 'uint8array' | 'text' | 'hex' | 'base64' | null | undefined;

function convert(result: Uint8Array, outputFormat?: OutputFormat): unknown {
  switch (outputFormat) {
    case 'base64':
      return sodium.to_base64(result, sodium.base64_variants.URLSAFE_NO_PADDING);
    case 'hex':
      return sodium.to_hex(result);
    case 'text':
      return sodium.to_string(result);
    default:
      return result;
  }
}

// Valores fijos de la especificación de libsodium (no cambian entre builds).
// No se leen de `sodium.*` porque el WASM de libsodium-wrappers-sumo termina
// de inicializar de forma asíncrona (`sodium.ready`), después de que estas
// constantes ya se habrían evaluado al importar este módulo.
export const crypto_pwhash_SALTBYTES = 16;
export const crypto_pwhash_ALG_ARGON2ID13 = 2;
export const crypto_aead_xchacha20poly1305_ietf_NPUBBYTES = 24;

export function crypto_pwhash(
  keyLength: number,
  password: string | Uint8Array,
  salt: Uint8Array,
  opsLimit: number,
  memLimit: number,
  algorithm: number,
  outputFormat?: OutputFormat
): unknown {
  const result = sodium.crypto_pwhash(keyLength, password, salt, opsLimit, memLimit, algorithm);
  return convert(result, outputFormat);
}

export function crypto_generichash(
  hashLength: number,
  message: string | Uint8Array,
  key?: Uint8Array | null,
  outputFormat?: OutputFormat
): unknown {
  const result = sodium.crypto_generichash(hashLength, message, key ?? null);
  return convert(result, outputFormat);
}

export function randombytes_buf(length: number, outputFormat?: OutputFormat): unknown {
  const result = sodium.randombytes_buf(length);
  return convert(result, outputFormat);
}

export function crypto_aead_xchacha20poly1305_ietf_encrypt(
  message: string | Uint8Array,
  additionalData: string | Uint8Array | null,
  _secretNonce: string | Uint8Array | null,
  publicNonce: Uint8Array,
  key: Uint8Array,
  outputFormat?: OutputFormat
): unknown {
  const result = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    additionalData ?? null,
    null,
    publicNonce,
    key
  );
  return convert(result, outputFormat);
}

export function crypto_aead_xchacha20poly1305_ietf_decrypt(
  _secretNonce: string | Uint8Array | null,
  ciphertext: string | Uint8Array,
  additionalData: string | Uint8Array | null,
  publicNonce: Uint8Array,
  key: Uint8Array,
  outputFormat?: OutputFormat
): unknown {
  const ciphertextBytes = typeof ciphertext === 'string' ? sodium.from_base64(ciphertext) : ciphertext;
  const result = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertextBytes,
    additionalData ?? null,
    publicNonce,
    key
  );
  return convert(result, outputFormat);
}

export function to_base64(input: string | Uint8Array): string {
  return sodium.to_base64(input, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export function from_base64(input: string): Uint8Array {
  return sodium.from_base64(input, sodium.base64_variants.URLSAFE_NO_PADDING);
}
