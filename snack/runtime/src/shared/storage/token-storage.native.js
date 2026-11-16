import * as SecureStore from 'expo-secure-store';
const SECURE_TOKEN_KEY = 'smart_barber_access_token';
/**
 * Adaptador Nativo (Android / iOS) utilizando Expo SecureStore
 */
export class NativeTokenStorage {
    async get() {
        try {
            return await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        }
        catch {
            return null;
        }
    }
    async set(token) {
        try {
            await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
        }
        catch (err) {
            console.warn('Erro ao gravar token no SecureStore:', err);
        }
    }
    async remove() {
        try {
            await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
        }
        catch (err) {
            console.warn('Erro ao remover token do SecureStore:', err);
        }
    }
}
