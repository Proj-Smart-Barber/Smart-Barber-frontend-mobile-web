export interface StoredSession {
  accessToken?: string | null;
  refreshToken?: string | null;
  accessExpiresAt?: string | null;
  sessionExpiresAt?: string | null;
  hasSession?: boolean;
  accountTypeHint?: string | null;
  selectedShopId?: string | null;
}

export interface SessionPersistence {
  read(): Promise<StoredSession | null>;
  save(record: StoredSession): Promise<void>;
  markLogoutPending(): Promise<void>;
  clear(): Promise<void>;
  isLogoutPending(): Promise<boolean>;
}
