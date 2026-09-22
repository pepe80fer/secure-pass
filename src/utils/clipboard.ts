import * as Clipboard from 'expo-clipboard';

/**
 * Copiar contraseñas al portapapeles con auto-limpieza. Ver plan.md, Fase 3.
 */

export const AUTO_CLEAR_SECONDS = 45;
const AUTO_CLEAR_MS = AUTO_CLEAR_SECONDS * 1000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;
let lastCopiedValue: string | null = null;

export async function copyToClipboard(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
  lastCopiedValue = value;

  if (clearTimer) {
    clearTimeout(clearTimer);
  }
  clearTimer = setTimeout(() => {
    void clearIfUnchanged();
  }, AUTO_CLEAR_MS);
}

async function clearIfUnchanged(): Promise<void> {
  // Solo limpia si el portapapeles todavía tiene lo que copiamos — el
  // usuario pudo haber copiado otra cosa mientras tanto.
  const current = await Clipboard.getStringAsync();
  if (current === lastCopiedValue) {
    await Clipboard.setStringAsync('');
  }
  lastCopiedValue = null;
  clearTimer = null;
}
