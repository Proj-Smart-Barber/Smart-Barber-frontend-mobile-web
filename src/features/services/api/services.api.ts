import { httpClient } from '@/shared/api';
import type {
  Service,
  ListServicesResponse,
  CreateServiceInput,
  UpdateServiceInput,
} from '../model/service.types';

export class ServicesApi {
  /**
   * Lista serviços de uma barbearia:
   * GET /api/barbershops/:shopId/services
   */
  async listServices(
    barbershopId: string,
    options?: {
      page?: number;
      limit?: number;
      includeInactive?: boolean;
    },
    token?: string | null,
  ): Promise<ListServicesResponse> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (options?.page) params.page = options.page;
    if (options?.limit) params.limit = options.limit;
    if (options?.includeInactive !== undefined) {
      params.includeInactive = options.includeInactive;
    }

    return httpClient.get<ListServicesResponse>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/services`,
      { params, token },
    );
  }

  /**
   * Obtém detalhes de um serviço específico:
   * GET /api/barbershops/:shopId/services/:serviceId
   */
  async getService(
    barbershopId: string,
    serviceId: string,
    token?: string | null,
  ): Promise<Service> {
    const response = await httpClient.get<{ service: Service }>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/services/${encodeURIComponent(serviceId)}`,
      { token },
    );
    return response.service;
  }

  /**
   * Cria novo serviço (restrito ao proprietário da barbearia):
   * POST /api/barbershops/:shopId/services
   */
  async createService(
    barbershopId: string,
    data: CreateServiceInput,
    token?: string | null,
  ): Promise<Service> {
    const response = await httpClient.post<{ service: Service }>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/services`,
      data,
      { token },
    );
    return response.service;
  }

  /**
   * Atualiza dados de um serviço:
   * PATCH /api/barbershops/:shopId/services/:serviceId
   */
  async updateService(
    barbershopId: string,
    serviceId: string,
    data: UpdateServiceInput,
    token?: string | null,
  ): Promise<Service> {
    const response = await httpClient.patch<{ service: Service }>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/services/${encodeURIComponent(serviceId)}`,
      data,
      { token },
    );
    return response.service;
  }

  /**
   * Alterna estado de ativação de um serviço:
   * PATCH /api/barbershops/:shopId/services/:serviceId/activation
   */
  async toggleServiceActivation(
    barbershopId: string,
    serviceId: string,
    isActive: boolean,
    token?: string | null,
  ): Promise<Service> {
    const response = await httpClient.patch<{ service: Service }>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/services/${encodeURIComponent(serviceId)}/activation`,
      { isActive },
      { token },
    );
    return response.service;
  }
}

export const servicesApi = new ServicesApi();
