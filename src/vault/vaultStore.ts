import { useEffect, useSyncExternalStore } from 'react';

import { getVaultKey, lock, subscribe as subscribeSession, isUnlocked } from '@/auth/session';
import { decryptVault, encryptVault } from '@/crypto/vaultCipher';
import { randombytes_buf, to_hex } from 'react-native-libsodium';
import { readEncryptedVaultBlob, writeEncryptedVaultBlob } from '@/vault/vaultRepository';
import type { CategoryIcons, VaultEntry } from '@/vault/types';

/**
 * Estado del vault en memoria: solo existe mientras la sesión está
 * desbloqueada (ver src/auth/session.ts) y se descarta por completo al
 * bloquear. Es el único módulo que decide CUÁNDO cifrar/descifrar; las
 * primitivas de disco viven en vaultRepository, las de cifrado en
 * src/crypto/vaultCipher. Ver plan.md.
 */

type Listener = () => void;
type PersistedVault = { entries: VaultEntry[]; categoryIcons: CategoryIcons };

let entries: VaultEntry[] = [];
let categoryIcons: CategoryIcons = {};
let loaded = false;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function requireVaultKey(): Uint8Array {
  const key = getVaultKey();
  if (!key) {
    throw new Error('El vault está bloqueado.');
  }
  return key;
}

function generateId(): string {
  return to_hex(randombytes_buf(16));
}

/** El formato original solo guardaba un array de entradas; esto lo migra en memoria sin tocar disco hasta el próximo save. */
function parsePersisted(json: string): PersistedVault {
  const parsed: unknown = JSON.parse(json);
  if (Array.isArray(parsed)) {
    return { entries: parsed as VaultEntry[], categoryIcons: {} };
  }
  const data = parsed as Partial<PersistedVault>;
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    categoryIcons: data.categoryIcons && typeof data.categoryIcons === 'object' ? data.categoryIcons : {},
  };
}

/** Descifra el vault desde disco la primera vez que se necesita; no-op después. */
export function ensureLoaded(): void {
  if (loaded) {
    return;
  }
  const key = requireVaultKey();
  const blob = readEncryptedVaultBlob();
  if (!blob) {
    entries = [];
    categoryIcons = {};
    loaded = true;
    notify();
    return;
  }

  try {
    const data = parsePersisted(decryptVault(blob, key));
    entries = data.entries;
    categoryIcons = data.categoryIcons;
    loaded = true;
    notify();
  } catch {
    // La llave en memoria no coincide con lo que hay en disco (ej. una
    // sesión que quedó en un estado inconsistente). En una app de
    // contraseñas es más seguro forzar un nuevo login que mostrar un error
    // o datos parciales — lock() dispara la sub­scripción que ya limpia
    // el store y (vault)/_layout.tsx redirige a /unlock automáticamente.
    lock();
  }
}

function persist(nextEntries: VaultEntry[], nextCategoryIcons: CategoryIcons): void {
  const key = requireVaultKey();
  const payload: PersistedVault = { entries: nextEntries, categoryIcons: nextCategoryIcons };
  // Cifra y escribe antes de comprometer el estado en memoria: si falla,
  // el estado en memoria no queda desincronizado de lo que realmente hay en disco.
  writeEncryptedVaultBlob(encryptVault(JSON.stringify(payload), key));
  entries = nextEntries;
  categoryIcons = nextCategoryIcons;
}

export function getEntries(): VaultEntry[] {
  return entries;
}

export function getCategoryIcons(): CategoryIcons {
  return categoryIcons;
}

/** Asigna (o, con `icon: null`, quita) el ícono elegido a mano para una categoría. */
export function setCategoryIcon(category: string, icon: string | null): void {
  ensureLoaded();
  const next = { ...categoryIcons };
  if (icon) {
    next[category] = icon;
  } else {
    delete next[category];
  }
  persist(entries, next);
  notify();
}

export function getEntry(id: string): VaultEntry | undefined {
  ensureLoaded();
  return entries.find((entry) => entry.id === id);
}

export type EntryInput = {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  isFavorite?: boolean;
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function addEntry(input: EntryInput): VaultEntry {
  ensureLoaded();
  const now = new Date().toISOString();
  const entry: VaultEntry = {
    id: generateId(),
    title: input.title.trim(),
    username: input.username.trim(),
    password: input.password,
    url: clean(input.url),
    notes: clean(input.notes),
    category: clean(input.category),
    isFavorite: input.isFavorite ?? false,
    createdAt: now,
    updatedAt: now,
    passwordChangedAt: now,
  };

  persist([...entries, entry], categoryIcons);
  notify();
  return entry;
}

export type EntryUpdateInput = Partial<EntryInput>;

export function updateEntry(id: string, changes: EntryUpdateInput): VaultEntry {
  ensureLoaded();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    throw new Error('La entrada ya no existe.');
  }

  const existing = entries[index];
  const now = new Date().toISOString();
  const nextPassword = changes.password ?? existing.password;
  const passwordChanged = nextPassword !== existing.password;

  const updated: VaultEntry = {
    ...existing,
    ...(changes.title !== undefined && { title: changes.title.trim() }),
    ...(changes.username !== undefined && { username: changes.username.trim() }),
    password: nextPassword,
    ...(changes.url !== undefined && { url: clean(changes.url) }),
    ...(changes.notes !== undefined && { notes: clean(changes.notes) }),
    ...(changes.category !== undefined && { category: clean(changes.category) }),
    ...(changes.isFavorite !== undefined && { isFavorite: changes.isFavorite }),
    updatedAt: now,
    passwordChangedAt: passwordChanged ? now : existing.passwordChangedAt,
  };

  const next = [...entries];
  next[index] = updated;
  persist(next, categoryIcons);
  notify();
  return updated;
}

export function deleteEntry(id: string): void {
  ensureLoaded();
  persist(
    entries.filter((entry) => entry.id !== id),
    categoryIcons
  );
  notify();
}

/** Categorías únicas ya usadas, para sugerirlas como chips (ver plan.md, Fase 3). */
export function listCategories(fromEntries: VaultEntry[]): string[] {
  const categories = new Set<string>();
  for (const entry of fromEntries) {
    if (entry.category) {
      categories.add(entry.category);
    }
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

/** Descarta el vault de memoria; se vuelve a descifrar al próximo desbloqueo. */
export function clear(): void {
  entries = [];
  categoryIcons = {};
  loaded = false;
  notify();
}

subscribeSession(() => {
  if (!isUnlocked()) {
    clear();
  }
});

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEntries(): VaultEntry[] {
  useEffect(() => {
    ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getEntries);
}

export function useCategoryIcons(): CategoryIcons {
  useEffect(() => {
    ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getCategoryIcons);
}
