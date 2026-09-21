/**
 * Mock de Jest para expo-file-system: sistema de archivos en memoria,
 * suficiente para probar vaultRepository sin acceso a disco real (no
 * disponible bajo Jest/Node). Mismo criterio que
 * __mocks__/react-native-libsodium.ts: probar nuestra lógica real
 * (serialización, manejo de "no existe"), no un doble de prueba.
 */

type PathPart = string | Directory | File;

const store = new Map<string, string>();

function normalize(parts: PathPart[]): string {
  return parts
    .map((part) => (typeof part === 'string' ? part : part.path))
    .join('/')
    .replace(/\/+/g, '/');
}

export class Directory {
  path: string;

  constructor(...uris: PathPart[]) {
    this.path = normalize(uris);
  }

  get exists(): boolean {
    return true;
  }

  create(): void {
    // Las "carpetas" no se modelan por separado en este mock en memoria.
  }
}

export class File {
  path: string;

  constructor(...uris: PathPart[]) {
    this.path = normalize(uris);
  }

  get exists(): boolean {
    return store.has(this.path);
  }

  create(): void {
    if (store.has(this.path)) {
      throw new Error(`File already exists: ${this.path}`);
    }
    store.set(this.path, '');
  }

  write(content: string): void {
    store.set(this.path, content);
  }

  textSync(): string {
    const content = store.get(this.path);
    if (content === undefined) {
      throw new Error(`File does not exist: ${this.path}`);
    }
    return content;
  }

  delete(): void {
    store.delete(this.path);
  }
}

export const Paths = {
  document: new Directory('file:///mock-documents'),
  cache: new Directory('file:///mock-cache'),
};

/** Solo para tests: limpia el estado entre casos. */
export function __resetMockFileSystem(): void {
  store.clear();
}
