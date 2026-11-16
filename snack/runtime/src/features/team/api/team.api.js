import { httpClient } from '../../../shared/api';
export const teamApi = {
    async listTeamMembers(shopId, params = {}) {
        var _a, _b;
        const query = new URLSearchParams();
        if (params.state)
            query.set('state', params.state);
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        const qs = query.toString();
        const url = `/api/barbershops/${shopId}/team${qs ? `?${qs}` : ''}`;
        const response = await httpClient.get(url);
        const members = ((_a = response.members) === null || _a === void 0 ? void 0 : _a.length) ? response.members : ((_b = response.items) !== null && _b !== void 0 ? _b : []);
        return {
            ...response,
            members,
            items: members,
        };
    },
    async getTeamMember(shopId, membershipId) {
        const response = await httpClient.get(`/api/barbershops/${shopId}/team/${membershipId}`);
        return response.member;
    },
    async deactivateMember(shopId, membershipId, expectedVersion, idempotencyKey) {
        return httpClient.patch(`/api/barbershops/${shopId}/team/${membershipId}/deactivation`, { expectedVersion }, {
            headers: {
                'Idempotency-Key': idempotencyKey,
            },
        });
    },
    async listInvitations(shopId, params = {}) {
        var _a, _b;
        const query = new URLSearchParams();
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        const qs = query.toString();
        const url = `/api/barbershops/${shopId}/invitations${qs ? `?${qs}` : ''}`;
        const response = await httpClient.get(url);
        const items = ((_a = response.items) === null || _a === void 0 ? void 0 : _a.length) ? response.items : ((_b = response.invitations) !== null && _b !== void 0 ? _b : []);
        return {
            ...response,
            items,
            invitations: items,
        };
    },
    async createBarberRegistration(shopId, payload, idempotencyKey) {
        return httpClient.post(`/api/barbershops/${shopId}/barber-registrations`, payload, {
            headers: {
                'Idempotency-Key': idempotencyKey,
            },
        });
    },
    async resendInvitation(shopId, invitationId, idempotencyKey) {
        return httpClient.post(`/api/barbershops/${shopId}/invitations/${invitationId}/resend`, {}, {
            headers: {
                'Idempotency-Key': idempotencyKey,
            },
        });
    },
    async revokeInvitation(shopId, invitationId, idempotencyKey) {
        const headers = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        return httpClient.delete(`/api/barbershops/${shopId}/invitations/${invitationId}`, { headers });
    },
};
