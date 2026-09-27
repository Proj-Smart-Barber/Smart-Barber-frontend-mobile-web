import { httpClient } from '@/shared/api';
import type {
  CreateBarbershopRequestDto,
  CreateBarbershopResponseDto,
  GetBarbershopResponseDto,
  BackendBarbershopEntityDto,
} from './barbershop.dto';

export class BarbershopApi {
  /**
   * Cria uma nova barbearia vinculada ao staff autenticado:
   * POST /api/barbershops
   */
  async createBarbershop(
    data: CreateBarbershopRequestDto,
    token?: string | null,
  ): Promise<CreateBarbershopResponseDto> {
    const cleanCnpj = data.cnpj.replace(/\D/g, '');
    return httpClient.post<CreateBarbershopResponseDto>(
      '/api/barbershops',
      {
        name: data.name.trim(),
        cnpj: cleanCnpj,
        location: data.location.trim(),
        timezone: data.timezone || 'America/Sao_Paulo',
        avatarUrl: data.avatarUrl,
      },
      { token },
    );
  }

  /**
   * Busca detalhes autoritativos de uma barbearia:
   * GET /api/barbershops/:shopId
   */
  async getBarbershop(
    shopId: string,
    token?: string | null,
  ): Promise<BackendBarbershopEntityDto> {
    const response = await httpClient.get<GetBarbershopResponseDto>(
      `/api/barbershops/${encodeURIComponent(shopId)}`,
      { token },
    );

    if (!response || !response.barbershop) {
      throw new Error('Barbearia não encontrada.');
    }

    return response.barbershop;
  }
}

export const barbershopApi = new BarbershopApi();
