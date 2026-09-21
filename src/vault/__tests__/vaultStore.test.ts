import * as FileSystemMock from 'expo-file-system';

import { lock, unlock } from '@/auth/session';
import {
  addEntry,
  clear,
  deleteEntry,
  ensureLoaded,
  getEntries,
  listCategories,
  subscribe,
  updateEntry,
} from '@/vault/vaultStore';

// El mock en __mocks__/expo-file-system.ts expone este helper solo para
// tests; no existe en el tipo real del paquete, de ahí el cast.
const { __resetMockFileSystem } = FileSystemMock as unknown as { __resetMockFileSystem: () => void };

function fakeKey(): Uint8Array {
  return new Uint8Array(32).fill(7);
}

beforeEach(() => {
  __resetMockFileSystem();
  lock();
  clear();
  unlock(fakeKey(), 5);
});

afterEach(() => {
  lock();
});

describe('vaultStore', () => {
  it('empieza vacío', () => {
    expect(getEntries()).toEqual([]);
  });

  it('rechaza operaciones si la sesión está bloqueada', () => {
    lock();
    expect(() => addEntry({ title: 'Banco', username: 'yo', password: 'hunter2' })).toThrow(
      'El vault está bloqueado.'
    );
  });

  it('agrega una entrada con id y timestamps, y la persiste', () => {
    const entry = addEntry({ title: 'Banco', username: 'yo@mail.com', password: 'hunter2' });

    expect(entry.id).toBeTruthy();
    expect(entry.createdAt).toBe(entry.updatedAt);
    expect(entry.passwordChangedAt).toBe(entry.createdAt);
    expect(getEntries()).toEqual([entry]);
  });

  it('recupera exactamente las mismas entradas tras "recargar" desde disco', () => {
    const entry = addEntry({ title: 'Banco', username: 'yo', password: 'hunter2', category: 'Finanzas' });

    // Simula bloquear (descarta memoria) y volver a desbloquear, forzando
    // que ensureLoaded() vuelva a descifrar desde el blob persistido.
    clear();
    unlock(fakeKey(), 5);
    ensureLoaded();

    expect(getEntries()).toEqual([entry]);
  });

  it('actualiza campos y solo cambia passwordChangedAt si la contraseña cambió', () => {
    const entry = addEntry({ title: 'Banco', username: 'yo', password: 'hunter2' });

    const renamed = updateEntry(entry.id, { title: 'Banco actualizado' });
    expect(renamed.title).toBe('Banco actualizado');
    expect(renamed.passwordChangedAt).toBe(entry.passwordChangedAt);

    const rotated = updateEntry(entry.id, { password: 'nueva-contraseña' });
    expect(rotated.password).toBe('nueva-contraseña');
    expect(rotated.passwordChangedAt).not.toBe(entry.passwordChangedAt);
  });

  it('falla al actualizar una entrada que no existe', () => {
    expect(() => updateEntry('no-existe', { title: 'x' })).toThrow('La entrada ya no existe.');
  });

  it('elimina una entrada', () => {
    const a = addEntry({ title: 'A', username: '', password: '1' });
    const b = addEntry({ title: 'B', username: '', password: '2' });

    deleteEntry(a.id);

    expect(getEntries()).toEqual([b]);
  });

  it('listCategories devuelve categorías únicas y ordenadas, sin vacíos', () => {
    const entries = [
      { category: 'Trabajo' },
      { category: 'Banco' },
      { category: undefined },
      { category: 'Banco' },
    ] as Parameters<typeof listCategories>[0];

    expect(listCategories(entries)).toEqual(['Banco', 'Trabajo']);
  });

  it('clear() descarta las entradas de memoria', () => {
    addEntry({ title: 'Banco', username: 'yo', password: 'hunter2' });
    clear();
    expect(getEntries()).toEqual([]);
  });

  it('se limpia automáticamente cuando la sesión se bloquea', () => {
    addEntry({ title: 'Banco', username: 'yo', password: 'hunter2' });
    expect(getEntries()).toHaveLength(1);

    lock();

    expect(getEntries()).toEqual([]);
  });

  it('notifica a los subscribers en cada mutación', () => {
    ensureLoaded(); // evita que la primera carga perezosa cuente como una notificación de la mutación
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    addEntry({ title: 'Banco', username: 'yo', password: 'hunter2' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
