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
