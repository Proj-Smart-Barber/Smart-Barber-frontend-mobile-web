import { Platform } from 'react-native';
const STORAGE_PREFIX = 'smart_barber_shop_';
export class MemoryBarbershopStorage {
    constructor() {
        this.map = new Map();
    }
    async get(staffId) {
        var _a;
        return (_a = this.map.get(staffId)) !== null && _a !== void 0 ? _a : null;
    }
    async set(staffId, barbershopId) {
        this.map.set(staffId, barbershopId);
    }
    async remove(staffId) {
        this.map.delete(staffId);
    }
}
export class WebBarbershopStorage {
    async get(staffId) {
        if (typeof window === 'undefined' || !window.localStorage) {
            return null;
        }
        try {
            return window.localStorage.getItem(`${STORAGE_PREFIX}${staffId}`);
        }
        catch {
            return null;
        }
    }
    async set(staffId, barbershopId) {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.setItem(`${STORAGE_PREFIX}${staffId}`, barbershopId);
        }
        catch (err) {
            console.warn('Erro ao salvar barbershopId no localStorage:', err);
        }
    }
    async remove(staffId) {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.removeItem(`${STORAGE_PREFIX}${staffId}`);
        }
        catch (err) {
            console.warn('Erro ao remover barbershopId do localStorage:', err);
        }
    }
}
function createBarbershopStorage() {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        return new MemoryBarbershopStorage();
    }
    if (Platform.OS === 'web') {
        return new WebBarbershopStorage();
    }
    try {
        const SecureStore = require('expo-secure-store');
        return {
            async get(staffId) {
                try {
                    return await SecureStore.getItemAsync(`${STORAGE_PREFIX}${staffId}`);
                }
                catch {
                    return null;
                }
            },
            async set(staffId, barbershopId) {
                try {
                    await SecureStore.setItemAsync(`${STORAGE_PREFIX}${staffId}`, barbershopId);
                }
                catch (err) {
                    console.warn('Erro ao gravar barbershopId no SecureStore:', err);
                }
            },
            async remove(staffId) {
                try {
                    await SecureStore.deleteItemAsync(`${STORAGE_PREFIX}${staffId}`);
                }
                catch (err) {
                    console.warn('Erro ao remover barbershopId do SecureStore:', err);
                }
            },
        };
    }
    catch {
        return new WebBarbershopStorage();
    }
}
export const barbershopStorage = createBarbershopStorage();
