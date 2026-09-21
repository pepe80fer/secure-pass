import { Directory, File, Paths } from 'expo-file-system';

import type { EncryptedVault } from '@/crypto/vaultCipher';
import type { VaultMeta } from '@/vault/types';

/**
 * Único punto que toca los archivos del vault en disco. `vault.meta.json` no
 * está cifrado (el salt, los parámetros KDF y el verificador no son secretos
 * por diseño — ver plan.md sección 3); `vault.enc` es el blob cifrado
 * completo (ver src/crypto/vaultCipher.ts). Fase 3 construye el CRUD de
 * entradas sobre estas mismas primitivas de lectura/escritura.
 */

const vaultDirectory = new Directory(Paths.document, 'vault');
const metaFile = new File(vaultDirectory, 'vault.meta.json');
const blobFile = new File(vaultDirectory, 'vault.enc');

function ensureVaultDirectory(): void {
  if (!vaultDirectory.exists) {
    vaultDirectory.create({ intermediates: true });
  }
}

function writeJsonFile(file: File, data: unknown): void {
  ensureVaultDirectory();
  if (!file.exists) {
    file.create();
  }
  file.write(JSON.stringify(data));
}

/** true si ya existe un vault configurado en este dispositivo. */
export function vaultExists(): boolean {
  return metaFile.exists;
}

export function readVaultMeta(): VaultMeta | null {
  if (!metaFile.exists) {
    return null;
  }
  return JSON.parse(metaFile.textSync()) as VaultMeta;
}

export function writeVaultMeta(meta: VaultMeta): void {
  writeJsonFile(metaFile, meta);
}

export function readEncryptedVaultBlob(): EncryptedVault | null {
  if (!blobFile.exists) {
    return null;
  }
  return JSON.parse(blobFile.textSync()) as EncryptedVault;
}

export function writeEncryptedVaultBlob(blob: EncryptedVault): void {
  writeJsonFile(blobFile, blob);
}
