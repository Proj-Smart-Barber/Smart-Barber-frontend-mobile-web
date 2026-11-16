import { httpClient } from '../../../shared/api';
export class BarbershopApi {
    /**
     * Cria uma nova barbearia vinculada ao staff autenticado:
     * POST /api/barbershops
     */
    async createBarbershop(data, token) {
        const cleanCnpj = data.cnpj.replace(/\D/g, '');
        return httpClient.post('/api/barbershops', {
            name: data.name.trim(),
            cnpj: cleanCnpj,
            location: data.location.trim(),
            timezone: data.timezone || 'America/Sao_Paulo',
            avatarUrl: data.avatarUrl,
        }, { token });
    }
    /**
     * Busca detalhes autoritativos de uma barbearia:
     * GET /api/barbershops/:shopId
     */
    async getBarbershop(shopId, token) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}`, { token: null, publicRequest: true });
        if (!response || !response.barbershop) {
            throw new Error('Barbearia não encontrada.');
        }
        return response.barbershop;
    }
}
export const barbershopApi = new BarbershopApi();
