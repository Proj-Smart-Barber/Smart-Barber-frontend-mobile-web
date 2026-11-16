/**
 * Helper utilitário para decodificação segura de JWT no cliente
 * (Uso estritamente para UX/prevenção de chamadas com token expirado; a autoridade final é o backend)
 */
export function decodeJwt(token) {
    if (!token || typeof token !== 'string')
        return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        // Decodifica a parte do meio (payload) em base64
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''));
        return JSON.parse(jsonPayload);
    }
    catch {
        return null;
    }
}
export function isTokenExpired(token, skewSeconds = 30) {
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) {
        return true; // Se não puder ler exp, considera inválido/expirado
    }
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= currentTimeSeconds + skewSeconds;
}
