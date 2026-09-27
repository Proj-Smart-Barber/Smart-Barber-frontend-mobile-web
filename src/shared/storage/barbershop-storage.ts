import { Platform } from 'react-native';

export interface BarbershopStorage {
  get(staffId: string): Promise<string | null>;
  set(staffId: string, barbershopId: string): Promise<void>;
  remove(staffId: string): Promise<void>;
}

const STORAGE_PREFIX = 'smart_barber_shop_';

export class MemoryBarbershopStorage implements BarbershopStorage {
  private map = new Map<string, string>();

  async get(staffId: string): Promise<string | null> {
    return this.map.get(staffId) ?? null;
  }

  async set(staffId: string, barbershopId: string): Promise<void> {
    this.map.set(staffId, barbershopId);
  }

  async remove(staffId: string): Promise<void> {
    this.map.delete(staffId);
  }
}

export class WebBarbershopStorage implements BarbershopStorage {
  async get(staffId: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(`${STORAGE_PREFIX}${staffId}`);
    } catch {
      return null;
    }
  }

  async set(staffId: string, barbershopId: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${staffId}`, barbershopId);
    } catch (err) {
      console.warn('Erro ao salvar barbershopId no localStorage:', err);
    }
  }

  async remove(staffId: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${staffId}`);
    } catch (err) {
      console.warn('Erro ao remover barbershopId do localStorage:', err);
    }
  }
}

function createBarbershopStorage(): BarbershopStorage {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return new MemoryBarbershopStorage();
  }

  if (Platform.OS === 'web') {
    return new WebBarbershopStorage();
  }

  try {
    const SecureStore = require('expo-secure-store');
    return {
      async get(staffId: string) {
        try {
          return await SecureStore.getItemAsync(`${STORAGE_PREFIX}${staffId}`);
        } catch {
          return null;
        }
      },
      async set(staffId: string, barbershopId: string) {
        try {
          await SecureStore.setItemAsync(`${STORAGE_PREFIX}${staffId}`, barbershopId);
        } catch (err) {
          console.warn('Erro ao gravar barbershopId no SecureStore:', err);
        }
      },
      async remove(staffId: string) {
        try {
          await SecureStore.deleteItemAsync(`${STORAGE_PREFIX}${staffId}`);
        } catch (err) {
          console.warn('Erro ao remover barbershopId do SecureStore:', err);
        }
      },
    };
  } catch {
    return new WebBarbershopStorage();
  }
}

export const barbershopStorage: BarbershopStorage = createBarbershopStorage();
