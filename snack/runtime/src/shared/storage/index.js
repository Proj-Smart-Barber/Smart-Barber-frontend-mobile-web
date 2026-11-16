import { Platform } from 'react-native';
import { MemoryTokenStorage } from './token-storage.memory';
import { WebTokenStorage } from './token-storage.web';
import { WebSessionStorage } from './session-storage.web';
export * from './token-storage';
export * from './token-storage.memory';
export * from './token-storage.web';
export * from './barbershop-storage';
export * from './session-storage';
export * from './session-storage.web';
function createTokenStorage() {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        return new MemoryTokenStorage();
    }
    if (Platform.OS === 'web') {
        return new WebTokenStorage();
    }
    try {
        const { NativeTokenStorage } = require('./token-storage.native');
        return new NativeTokenStorage();
    }
    catch {
        return new WebTokenStorage();
    }
}
function createSessionStorage() {
    if (Platform.OS === 'web' || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) {
        return new WebSessionStorage();
    }
    try {
        const { NativeSessionStorage } = require('./session-storage.native');
        return new NativeSessionStorage();
    }
    catch {
        return new WebSessionStorage();
    }
}
export const tokenStorage = createTokenStorage();
export const sessionStorage = createSessionStorage();
