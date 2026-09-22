/** Contratos de datos del vault. Ver plan.md, sección 3. */

export type VaultEntry = {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
};

/**
 * Ícono elegido para cada categoría (nombre de Ionicons, como string genérico
 * — la validación de que sea un ícono real vive en la capa de UI). Vive
 * cifrado junto a las entradas, no en VaultMeta: los nombres de categoría no
 * deben quedar en texto plano en disco.
 */
export type CategoryIcons = Record<string, string>;

export type VaultMeta = {
  kdfSalt: string;
  kdfParams: {
    opsLimit: number;
    memLimitKb: number;
  };
  verifierHash: string;
  autoLockMinutes: number;
  biometricEnabled: boolean;
};
