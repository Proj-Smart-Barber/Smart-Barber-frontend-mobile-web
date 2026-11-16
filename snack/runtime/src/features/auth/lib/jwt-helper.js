/**
 * Helper utilitário para decodificação segura de JWT no cliente
 * (Uso estritamente para UX/prevenção de chamadas com token expirado; a autoridade final é o backend)
 */
function decodeJwtSegment(segment) {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64)
        .split('')
        .map((character) => '%' + character.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')));
}
export function decodeJwt(token) {
    if (!token || typeof token !== 'string')
        return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3 || parts.some((part) => !part || /[^A-Za-z0-9_-]/.test(part) || part.length % 4 === 1)) {
            return null;
        }
        const header = decodeJwtSegment(parts[0]);
        if (typeof (header === null || header === void 0 ? void 0 : header.alg) !== 'string' || !header.alg)
            return null;
        const payload = decodeJwtSegment(parts[1]);
        return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
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
