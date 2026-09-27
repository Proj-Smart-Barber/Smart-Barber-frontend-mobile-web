export interface CreateBarbershopRequestDto {
  name: string;
  cnpj: string;
  location: string;
  timezone?: string;
  avatarUrl?: string;
}

export interface CreateBarbershopResponseDto {
  barbershopId: string;
}

export interface BackendBarbershopEntityDto {
  id: string;
  name: string;
  ownerId: string;
  slug: string;
  cnpj: string;
  location: string;
  timezone: string;
  status: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface GetBarbershopResponseDto {
  barbershop: BackendBarbershopEntityDto;
}
