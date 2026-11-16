import { normalizeStaffRole } from '../../../entities/staff';
export function mapStaffDtoToEntity(raw) {
    return {
        id: raw.id,
        name: raw.name,
        email: raw.email,
        avatarUrl: raw.avatarUrl || null,
        role: normalizeStaffRole(raw.role),
    };
}
export function mapSessionDtoToGrant(dto) {
    var _a, _b, _c;
    if (!dto.access_token) {
        throw new Error('access_token ausente no SessionDto');
    }
    const serverTime = (_a = dto.serverTime) !== null && _a !== void 0 ? _a : new Date().toISOString();
    const accessExpiresAt = (_b = dto.accessExpiresAt) !== null && _b !== void 0 ? _b : new Date(new Date(serverTime).getTime() + 15 * 60 * 1000).toISOString();
    const sessionExpiresAt = (_c = dto.sessionExpiresAt) !== null && _c !== void 0 ? _c : new Date(new Date(serverTime).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
        accessToken: dto.access_token,
        refreshToken: dto.refresh_token,
        accessExpiresAt,
        sessionExpiresAt,
        serverTime,
    };
}
export function mapMeResponseToIdentity(res) {
    var _a, _b, _c, _d, _e, _f;
    const userData = res.user;
    if (!userData) {
        if (res.staff) {
            throw new Error('Perfil inválido: accountType é obrigatório no contrato de identidade');
        }
        throw new Error('Resposta de perfil inválida ou incompleta recebida do servidor');
    }
    if (!userData.accountType) {
        throw new Error('Perfil inválido: accountType é obrigatório no contrato de identidade');
    }
    return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        accountType: userData.accountType,
        emailVerifiedAt: (_a = userData.emailVerifiedAt) !== null && _a !== void 0 ? _a : null,
        phoneNumber: (_b = userData.phoneNumber) !== null && _b !== void 0 ? _b : null,
        avatarUrl: (_c = userData.avatarUrl) !== null && _c !== void 0 ? _c : null,
        onboardingIntent: (_d = userData.onboardingIntent) !== null && _d !== void 0 ? _d : null,
        credentialVersion: (_e = userData.credentialVersion) !== null && _e !== void 0 ? _e : 1,
        createdAt: userData.createdAt,
        staff: res.staff
            ? {
                id: res.staff.id,
                role: res.staff.role || 'BARBERMAN',
                avatarUrl: res.staff.avatarUrl,
                phoneNumber: (_f = res.staff.phoneNumber) !== null && _f !== void 0 ? _f : null,
            }
            : null,
    };
}
