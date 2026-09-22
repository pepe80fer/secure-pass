import * as Clipboard from 'expo-clipboard';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

import { AUTO_CLEAR_SECONDS, copyToClipboard } from '@/utils/clipboard';

const AUTO_CLEAR_MS = AUTO_CLEAR_SECONDS * 1000;

const setStringAsync = Clipboard.setStringAsync as jest.Mock;
const getStringAsync = Clipboard.getStringAsync as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  setStringAsync.mockClear();
  getStringAsync.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('copyToClipboard', () => {
  it('copia el valor al portapapeles', async () => {
    await copyToClipboard('hunter2');
    expect(setStringAsync).toHaveBeenCalledWith('hunter2');
  });

  it('limpia el portapapeles después del tiempo de auto-borrado', async () => {
    getStringAsync.mockResolvedValue('hunter2');
    await copyToClipboard('hunter2');

    await jest.advanceTimersByTimeAsync(AUTO_CLEAR_MS);

    expect(setStringAsync).toHaveBeenLastCalledWith('');
  });

  it('no borra el portapapeles si el usuario copió otra cosa mientras tanto', async () => {
    getStringAsync.mockResolvedValue('otra-cosa-que-el-usuario-copió');
    await copyToClipboard('hunter2');

    await jest.advanceTimersByTimeAsync(AUTO_CLEAR_MS);

    expect(setStringAsync).not.toHaveBeenCalledWith('');
  });

  it('un segundo copiado reinicia el temporizador de borrado', async () => {
    getStringAsync.mockResolvedValue('segunda');
    await copyToClipboard('primera');
    await jest.advanceTimersByTimeAsync(30_000);

    await copyToClipboard('segunda');
    await jest.advanceTimersByTimeAsync(30_000);
    expect(setStringAsync).not.toHaveBeenLastCalledWith('');

    await jest.advanceTimersByTimeAsync(15_000);
    expect(setStringAsync).toHaveBeenLastCalledWith('');
  });
});
