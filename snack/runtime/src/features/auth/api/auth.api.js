import { Platform } from 'react-native';
import { httpClient } from '../../../shared/api';
import { ENV } from '../../../shared/config/env';
import { mapSessionDtoToGrant, mapMeResponseToIdentity, mapStaffDtoToEntity } from './auth.mapper';
// Public authentication endpoints must not inherit an existing session.
const PUBLIC_AUTH_OPTIONS = { token: null, credentials: 'omit' };
export class AuthApi {
    /**
     * Realiza login no backend: POST /api/users/sessions/auth
     */
    async login(credentials) {
        let dto;
        const options = ENV.SNACK_HTTP_WEB ? PUBLIC_AUTH_OPTIONS : undefined;
        try {
            dto = await httpClient.post('/api/users/sessions/auth', credentials, options);
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 404) {
                dto = await httpClient.post('/api/staffs/sessions/auth', credentials, options);
            }
            else {
                throw err;
            }
        }
        const grant = mapSessionDtoToGrant(dto);
        if (ENV.SNACK_HTTP_WEB) {
            if (!dto.accessExpiresAt || !dto.serverTime) {
                throw new Error('O servidor não informou a validade da sessão.');
            }
            return {
                access_token: grant.accessToken,
                accessToken: grant.accessToken,
                accessExpiresAt: grant.accessExpiresAt,
                sessionExpiresAt: grant.sessionExpiresAt,
                serverTime: grant.serverTime,
            };
        }
        return {
            ...dto,
            ...grant,
        };
    }
    /**
     * Atualiza a sessão (refresh token)
     * Web: não envia corpo (cookie HttpOnly é anexado pelo browser)
     * Native: envia { refresh_token }
     */
    async refresh(refreshToken) {
        const isWeb = Platform.OS === 'web';
        const body = isWeb ? {} : { refresh_token: refreshToken };
        const dto = await httpClient.post('/api/users/sessions/refresh', body);
        return mapSessionDtoToGrant(dto);
    }
    /**
     * Encerra a sessão atual
     * Web: não envia corpo (cookie HttpOnly é limpo pelo servidor)
     * Native: envia { refresh_token }
     */
    async signOut(refreshToken) {
        const isWeb = Platform.OS === 'web';
        const body = isWeb ? {} : { refresh_token: refreshToken };
        await httpClient.post('/api/users/sessions/sign-out', body);
    }
    /**
     * Encerra todas as sessões ativas do usuário
     */
    async logoutAll(accessToken) {
        await httpClient.post('/api/users/sessions/logout-all', {}, { token: accessToken });
    }
    /**
     * Altera a senha do usuário autenticado
     */
    async changePassword(data, accessToken) {
        await httpClient.patch('/api/users/me/password', data, { token: accessToken });
    }
    /**
     * Atualiza dados de perfil do usuário autenticado: PATCH /api/users/me
     */
    async updateProfile(data, accessToken) {
        return await httpClient.patch('/api/users/me', data, {
            token: accessToken,
        });
    }
    /**
     * Cria conta sem sessão. A URL sem barra final é canônica no proxy web.
     */
    async register(data) {
        try {
            return await httpClient.post('/api/users', data, PUBLIC_AUTH_OPTIONS);
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 404) {
                return await httpClient.post('/api/staffs', data, PUBLIC_AUTH_OPTIONS);
            }
            throw err;
        }
    }
    /**
     * Busca perfil autoritativo do usuário logado: GET /api/users/me
     */
    async getIdentity(token) {
        let response;
        try {
            response = await httpClient.get('/api/users/me', { token });
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 404) {
                response = await httpClient.get('/api/staffs/me', { token });
            }
            else {
                throw err;
            }
        }
        return mapMeResponseToIdentity(response);
    }
    /**
     * Busca barbearias vinculadas ao usuário autenticado: GET /api/users/me/barbershops
     */
    async getMemberships(token) {
        let response;
        try {
            response = await httpClient.get('/api/users/me/barbershops', {
                token,
            });
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 404) {
                response = await httpClient.get('/api/staffs/me/barbershops', { token });
            }
            else {
                throw err;
            }
        }
        // This endpoint (including /staffs alias) returns ACTIVE memberships only.
        return ((response === null || response === void 0 ? void 0 : response.barbershops) || []).map(m => { var _a; return ({ ...m, state: (_a = m.state) !== null && _a !== void 0 ? _a : 'ACTIVE' }); });
    }
    /**
     * Envia código de verificação de e-mail
     */
    async sendEmailVerification(email) {
        await httpClient.post('/api/users/verification-email', { email }, PUBLIC_AUTH_OPTIONS);
    }
    /**
     * Confirma verificação de e-mail por token
     */
    async confirmEmailVerification(input) {
        return await httpClient.post('/api/users/verification-email/confirm', typeof input === 'string' ? { token: input } : input, PUBLIC_AUTH_OPTIONS);
    }
    /**
     * Envia link de recuperação de senha
     */
    async sendPasswordRecovery(email) {
        await httpClient.post('/api/users/password-recovery', { email });
    }
    /**
     * Redefine senha com token de recuperação
     */
    async resetPassword(data) {
        await httpClient.post('/api/users/password-recovery/reset', data);
    }
    /**
     * Compatibilidade legado: busca perfil staff
     */
    async getMe(token) {
        var _a;
        let response;
        try {
            response = await httpClient.get('/api/users/me', { token });
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 404) {
                response = await httpClient.get('/api/staffs/me', { token });
            }
            else {
                throw err;
            }
        }
        const staffData = (response === null || response === void 0 ? void 0 : response.user) || (response === null || response === void 0 ? void 0 : response.staff);
        if (!response || !staffData) {
            throw new Error('Resposta de perfil inválida ou incompleta recebida do servidor.');
        }
        return {
            staff: mapStaffDtoToEntity(staffData),
            barbershop: (_a = response.barbershop) !== null && _a !== void 0 ? _a : null,
        };
    }
    /**
     * Compatibilidade legado: busca barbearias
     */
    async getMyBarbershops(token) {
        return this.getMemberships(token);
    }
}
export const authApi = new AuthApi();
