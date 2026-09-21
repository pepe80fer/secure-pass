import { getVaultKey, isUnlocked, lock, subscribe, touch, unlock } from '@/auth/session';

function fakeKey(): Uint8Array {
  return new Uint8Array([1, 2, 3, 4]);
}

beforeEach(() => {
  jest.useFakeTimers();
  lock();
});

afterEach(() => {
  lock();
  jest.useRealTimers();
});

describe('session', () => {
  it('empieza bloqueada', () => {
    expect(isUnlocked()).toBe(false);
    expect(getVaultKey()).toBeNull();
  });

  it('unlock() guarda la llave y marca la sesión como desbloqueada', () => {
    const key = fakeKey();
    unlock(key, 5);

    expect(isUnlocked()).toBe(true);
    expect(getVaultKey()).toBe(key);
  });

  it('lock() descarta la llave', () => {
    unlock(fakeKey(), 5);
    lock();

    expect(isUnlocked()).toBe(false);
    expect(getVaultKey()).toBeNull();
  });

  it('se auto-bloquea después de autoLockMinutes de inactividad', () => {
    unlock(fakeKey(), 5);

    jest.advanceTimersByTime(5 * 60_000 - 1);
    expect(isUnlocked()).toBe(true);

    jest.advanceTimersByTime(1);
    expect(isUnlocked()).toBe(false);
  });

  it('touch() reinicia el temporizador de inactividad', () => {
    unlock(fakeKey(), 5);

    jest.advanceTimersByTime(4 * 60_000);
    touch();
    jest.advanceTimersByTime(4 * 60_000);

    expect(isUnlocked()).toBe(true);

    jest.advanceTimersByTime(60_000);
    expect(isUnlocked()).toBe(false);
  });

  it('notifica a los subscribers en unlock y lock', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    unlock(fakeKey(), 5);
    expect(listener).toHaveBeenCalledTimes(1);

    lock();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    unlock(fakeKey(), 5);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
