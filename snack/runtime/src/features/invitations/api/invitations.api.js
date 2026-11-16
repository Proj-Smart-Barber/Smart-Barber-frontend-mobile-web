import { httpClient } from '../../../shared/api/http-client';
export async function fetchUserInvitations() {
    var _a;
    const response = await httpClient.get('/api/invitations');
    return (_a = response.invitations) !== null && _a !== void 0 ? _a : [];
}
export async function getInvitation(invitationId) {
    const response = await httpClient.get(`/api/invitations/${invitationId}`);
    return response.invitation;
}
export async function acceptById(invitationId) {
    return httpClient.post(`/api/invitations/${invitationId}/accept`);
}
export async function declineById(invitationId) {
    return httpClient.post(`/api/invitations/${invitationId}/decline`);
}
