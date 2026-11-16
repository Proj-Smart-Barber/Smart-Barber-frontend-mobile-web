import { httpClient } from '../../../shared/api';
export class ServicesApi {
    /**
     * Lista serviços de uma barbearia:
     * GET /api/barbershops/:shopId/services
     */
    async listServices(barbershopId, options, token) {
        const params = {};
        if (options === null || options === void 0 ? void 0 : options.page)
            params.page = options.page;
        if (options === null || options === void 0 ? void 0 : options.limit)
            params.limit = options.limit;
        if ((options === null || options === void 0 ? void 0 : options.includeInactive) !== undefined) {
            params.includeInactive = options.includeInactive;
        }
        return httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/services`, { params, token, publicRequest: (options === null || options === void 0 ? void 0 : options.includeInactive) !== true });
    }
    /**
     * Obtém detalhes de um serviço específico:
     * GET /api/barbershops/:shopId/services/:serviceId
     */
    async getService(barbershopId, serviceId, token) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/services/${encodeURIComponent(serviceId)}`, { token });
        return response.service;
    }
    /**
     * Cria novo serviço (restrito ao proprietário da barbearia):
     * POST /api/barbershops/:shopId/services
     */
    async createService(barbershopId, data, token) {
        const response = await httpClient.post(`/api/barbershops/${encodeURIComponent(barbershopId)}/services`, data, { token });
        return response.service;
    }
    /**
     * Atualiza dados de um serviço:
     * PATCH /api/barbershops/:shopId/services/:serviceId
     */
    async updateService(barbershopId, serviceId, data, token) {
        const response = await httpClient.patch(`/api/barbershops/${encodeURIComponent(barbershopId)}/services/${encodeURIComponent(serviceId)}`, data, { token });
        return response.service;
    }
    /**
     * Alterna estado de ativação de um serviço:
     * PATCH /api/barbershops/:shopId/services/:serviceId/activation
     */
    async toggleServiceActivation(barbershopId, serviceId, isActive, token) {
        const response = await httpClient.patch(`/api/barbershops/${encodeURIComponent(barbershopId)}/services/${encodeURIComponent(serviceId)}/activation`, { isActive }, { token });
        return response.service;
    }
}
export const servicesApi = new ServicesApi();
