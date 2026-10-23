import { httpClient } from '@/shared/api';
import type {
  InitiateUploadRequestDto,
  InitiateUploadResponseDto,
  ConfirmUploadResponseDto,
  GalleryItemDto,
} from './media.types';

export class MediaApi {
  /**
   * Solicita URL pré-assinada para upload direto:
   * POST /api/media/upload-intent
   */
  async initiateUpload(
    data: InitiateUploadRequestDto,
    token?: string | null,
  ): Promise<InitiateUploadResponseDto> {
    return httpClient.post<InitiateUploadResponseDto>(
      '/api/media/upload-intent',
      data,
      { token },
    );
  }

  /**
   * Envia os bytes diretamente para o bucket via URL pré-assinada (sem passar pelo processo da API)
   */
  async uploadToPresignedUrl(
    uploadUrl: string,
    fileBlob: Blob | ArrayBuffer,
    contentType: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: fileBlob,
      signal,
    });

    if (!response.ok) {
      throw new Error(`Falha no upload direto para o armazenamento: status ${response.status}`);
    }
  }

  /**
   * Confirma o upload, processa e valida a integridade/metadados no backend:
   * POST /api/media/:mediaId/confirm
   */
  async confirmUpload(
    mediaId: string,
    token?: string | null,
  ): Promise<ConfirmUploadResponseDto> {
    return httpClient.post<ConfirmUploadResponseDto>(
      `/api/media/${encodeURIComponent(mediaId)}/confirm`,
      {},
      { token },
    );
  }

  /**
   * Atualiza avatar do usuário logado:
   * PATCH /api/users/me/avatar
   */
  async updateUserAvatar(
    mediaId: string,
    token?: string | null,
  ): Promise<{ avatarUrl: string }> {
    return httpClient.patch<{ avatarUrl: string }>(
      '/api/users/me/avatar',
      { mediaId },
      { token },
    );
  }

  /**
   * Remove avatar do usuário logado:
   * DELETE /api/users/me/avatar
   */
  async removeUserAvatar(token?: string | null): Promise<void> {
    return httpClient.delete<void>('/api/users/me/avatar', { token });
  }

  /**
   * Atualiza logotipo da barbearia (apenas OWNER):
   * PATCH /api/barbershops/:shopId/logo
   */
  async updateBarbershopLogo(
    shopId: string,
    mediaId: string | null,
    token?: string | null,
  ): Promise<{ avatarUrl: string | null }> {
    return httpClient.patch<{ avatarUrl: string | null }>(
      `/api/barbershops/${encodeURIComponent(shopId)}/logo`,
      { mediaId },
      { token },
    );
  }

  /**
   * Remove logotipo da barbearia (apenas OWNER):
   * DELETE /api/barbershops/:shopId/logo
   */
  async removeBarbershopLogo(
    shopId: string,
    token?: string | null,
  ): Promise<void> {
    return httpClient.delete<void>(
      `/api/barbershops/${encodeURIComponent(shopId)}/logo`,
      { token },
    );
  }

  /**
   * Atualiza link do Google Maps da unidade:
   * PATCH /api/barbershops/:shopId/google-url
   */
  async updateBarbershopGoogleUrl(
    shopId: string,
    googleMapsUrl: string | null,
    token?: string | null,
  ): Promise<{ googleMapsUrl: string | null }> {
    return httpClient.patch<{ googleMapsUrl: string | null }>(
      `/api/barbershops/${encodeURIComponent(shopId)}/google-url`,
      { googleMapsUrl },
      { token },
    );
  }

  /**
   * Lista itens da galeria da unidade:
   * GET /api/barbershops/:shopId/gallery
   */
  async getBarbershopGallery(
    shopId: string,
    tokenOrOptions?: string | null | { token?: string | null; signal?: AbortSignal },
  ): Promise<GalleryItemDto[]> {
    const options =
      typeof tokenOrOptions === 'object' && tokenOrOptions !== null
        ? tokenOrOptions
        : { token: tokenOrOptions };
    const res = await httpClient.get<{ items: GalleryItemDto[] }>(
      `/api/barbershops/${encodeURIComponent(shopId)}/gallery`,
      options,
    );
    return res.items || [];
  }

  /**
   * Adiciona foto à galeria da unidade:
   * POST /api/barbershops/:shopId/gallery
   */
  async addGalleryPhoto(
    shopId: string,
    mediaId: string,
    caption?: string,
    isCover?: boolean,
    token?: string | null,
  ): Promise<{ item: GalleryItemDto }> {
    return httpClient.post<{ item: GalleryItemDto }>(
      `/api/barbershops/${encodeURIComponent(shopId)}/gallery`,
      { mediaId, caption, isCover },
      { token },
    );
  }

  /**
   * Remove foto da galeria da unidade:
   * DELETE /api/barbershops/:shopId/gallery/:galleryItemId
   */
  async removeGalleryPhoto(
    shopId: string,
    galleryItemId: string,
    token?: string | null,
  ): Promise<void> {
    return httpClient.delete<void>(
      `/api/barbershops/${encodeURIComponent(shopId)}/gallery/${encodeURIComponent(galleryItemId)}`,
      { token },
    );
  }

  /**
   * Reordena itens da galeria:
   * PATCH /api/barbershops/:shopId/gallery/reorder
   */
  async reorderGallery(
    shopId: string,
    itemIds: string[],
    token?: string | null,
  ): Promise<void> {
    return httpClient.patch<void>(
      `/api/barbershops/${encodeURIComponent(shopId)}/gallery/reorder`,
      { itemIds },
      { token },
    );
  }

  /**
   * Define foto de capa da barbearia:
   * PATCH /api/barbershops/:shopId/gallery/:galleryItemId/cover
   */
  async setGalleryCover(
    shopId: string,
    galleryItemId: string,
    token?: string | null,
  ): Promise<void> {
    return httpClient.patch<void>(
      `/api/barbershops/${encodeURIComponent(shopId)}/gallery/${encodeURIComponent(galleryItemId)}/cover`,
      {},
      { token },
    );
  }
}

export const mediaApi = new MediaApi();
