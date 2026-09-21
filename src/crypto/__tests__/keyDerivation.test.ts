import { to_base64 } from 'react-native-libsodium';

import {
  computeKeyVerifier,
  defaultKdfParams,
  deriveVaultKey,
  generateKdfSalt,
  verifyVaultKey,
  type KdfParams,
} from '@/crypto/keyDerivation';

// Argon2id real, pero con el costo mínimo que permite libsodium: prueba el
// comportamiento de la función, no el costo de producción (ver defaultKdfParams
// más abajo, que sí se compara contra los valores reales usados en el vault).
const FAST_PARAMS: KdfParams = { opsLimit: 1, memLimitKb: 8 };

describe('keyDerivation', () => {
  it('deriva la misma llave para la misma contraseña, salt y params', () => {
    const salt = generateKdfSalt();
    const key1 = deriveVaultKey('correct horse battery staple', salt, FAST_PARAMS);
    const key2 = deriveVaultKey('correct horse battery staple', salt, FAST_PARAMS);
    expect(Array.from(key1)).toEqual(Array.from(key2));
    expect(key1.length).toBe(32);
  });

  it('deriva una llave distinta si cambia la contraseña', () => {
    const salt = generateKdfSalt();
    const key1 = deriveVaultKey('contraseña-correcta', salt, FAST_PARAMS);
    const key2 = deriveVaultKey('contraseña-incorrecta', salt, FAST_PARAMS);
    expect(Array.from(key1)).not.toEqual(Array.from(key2));
  });

  it('deriva una llave distinta si cambia el salt', () => {
    const key1 = deriveVaultKey('misma-contraseña', generateKdfSalt(), FAST_PARAMS);
    const key2 = deriveVaultKey('misma-contraseña', generateKdfSalt(), FAST_PARAMS);
    expect(Array.from(key1)).not.toEqual(Array.from(key2));
  });

  it('genera salts distintos en cada llamada', () => {
    const salts = new Set(Array.from({ length: 20 }, () => generateKdfSalt()));
    expect(salts.size).toBe(20);
  });

  it('defaultKdfParams usa el costo "moderate" de Argon2id documentado en plan.md', () => {
    expect(defaultKdfParams()).toEqual({ opsLimit: 3, memLimitKb: 262144 });
  });

  describe('verificador de contraseña', () => {
    it('valida la llave correcta', () => {
      const key = deriveVaultKey('mi-contraseña-maestra', generateKdfSalt(), FAST_PARAMS);
      const verifier = computeKeyVerifier(key);
      expect(verifyVaultKey(key, verifier)).toBe(true);
    });

    it('rechaza una llave derivada de una contraseña distinta', () => {
      const salt = generateKdfSalt();
      const realKey = deriveVaultKey('mi-contraseña-maestra', salt, FAST_PARAMS);
      const wrongKey = deriveVaultKey('otra-contraseña', salt, FAST_PARAMS);
      const verifier = computeKeyVerifier(realKey);
      expect(verifyVaultKey(wrongKey, verifier)).toBe(false);
    });

    it('no expone la llave dentro del verificador', () => {
      const key = deriveVaultKey('mi-contraseña-maestra', generateKdfSalt(), FAST_PARAMS);
      const verifier = computeKeyVerifier(key);
      expect(verifier).not.toContain(to_base64(key));
    });
  });
});
