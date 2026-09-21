import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Sesión en memoria: guarda la llave del vault solo mientras está
 * desbloqueado, con auto-lock por inactividad. La llave nunca se persiste
 * aquí — solo vive en este módulo mientras dura la sesión. Ver plan.md.
 */

type Listener = () => void;

let vaultKey: Uint8Array | null = null;
let autoLockMinutes = 5;
let lockTimer: ReturnType<typeof setTimeout> | null = null;
let backgroundedAt: number | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function clearLockTimer(): void {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
}

function armLockTimer(): void {
  clearLockTimer();
  lockTimer = setTimeout(lock, autoLockMinutes * 60_000);
}

/** Desbloquea la sesión con una llave ya derivada/recuperada (password o biometría). */
export function unlock(key: Uint8Array, minutes: number): void {
  vaultKey = key;
  autoLockMinutes = minutes;
  armLockTimer();
  notify();
}

/** Bloquea la sesión y descarta la llave de memoria. */
export function lock(): void {
  vaultKey?.fill(0);
  vaultKey = null;
  clearLockTimer();
  notify();
}

export function isUnlocked(): boolean {
  return vaultKey !== null;
}

export function getVaultKey(): Uint8Array | null {
  return vaultKey;
}

/** Reinicia el temporizador de inactividad; llamar ante interacción del usuario. */
export function touch(): void {
  if (vaultKey) {
    armLockTimer();
  }
}

export function setAutoLockMinutes(minutes: number): void {
  autoLockMinutes = minutes;
  if (vaultKey) {
    armLockTimer();
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isUnlocked);
}

// Los setTimeout de JS se pausan mientras la app está en background: al
// volver a foreground, si pasó más tiempo que autoLockMinutes desde que se
// fue a background, se bloquea de inmediato en vez de confiar en un timer
// que nunca corrió.
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background' || state === 'inactive') {
    backgroundedAt = Date.now();
    return;
  }

  if (state === 'active' && backgroundedAt !== null) {
    const elapsedMinutes = (Date.now() - backgroundedAt) / 60_000;
    if (vaultKey && elapsedMinutes >= autoLockMinutes) {
      lock();
    } else if (vaultKey) {
      armLockTimer();
    }
    backgroundedAt = null;
  }
});
