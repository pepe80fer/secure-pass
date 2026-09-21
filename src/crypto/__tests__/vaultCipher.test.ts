import { randombytes_buf } from 'react-native-libsodium';

import { decryptVault, encryptVault } from '@/crypto/vaultCipher';

function randomKey(): Uint8Array {
  return randombytes_buf(32) as Uint8Array;
}

describe('vaultCipher', () => {
  it('descifra exactamente lo que se cifró (round-trip)', () => {
    const key = randomKey();
    const plaintext = JSON.stringify({ entries: [{ title: 'Banco', password: 'hunter2' }] });

    const blob = encryptVault(plaintext, key);
    const decrypted = decryptVault(blob, key);

    expect(decrypted).toBe(plaintext);
  });

  it('usa un nonce distinto en cada cifrado, incluso para el mismo texto', () => {
    const key = randomKey();
    const a = encryptVault('mismo contenido', key);
    const b = encryptVault('mismo contenido', key);

    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('rechaza el descifrado con la llave equivocada', () => {
    const blob = encryptVault('dato sensible', randomKey());
    expect(() => decryptVault(blob, randomKey())).toThrow();
  });

  it('detecta manipulación del ciphertext', () => {
    const key = randomKey();
    const blob = encryptVault('dato sensible', key);

    expect(() => decryptVault({ ...blob, ciphertext: flipLastByte(blob.ciphertext) }, key)).toThrow();
  });

  it('detecta manipulación del nonce', () => {
    const key = randomKey();
    const blob = encryptVault('dato sensible', key);

    expect(() => decryptVault({ ...blob, nonce: flipLastByte(blob.nonce) }, key)).toThrow();
  });

  it('detecta un ciphertext truncado', () => {
    const key = randomKey();
    const blob = encryptVault('dato sensible', key);

    expect(() =>
      decryptVault({ ...blob, ciphertext: blob.ciphertext.slice(0, -4) }, key)
    ).toThrow();
  });
});

/** Cambia el último caracter base64 por otro distinto, para simular manipulación de bytes. */
function flipLastByte(base64: string): string {
  const last = base64.at(-1)!;
  const replacement = last === 'A' ? 'B' : 'A';
  return base64.slice(0, -1) + replacement;
}
