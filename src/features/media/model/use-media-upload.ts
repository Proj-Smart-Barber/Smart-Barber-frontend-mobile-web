import { useState, useCallback } from 'react';
import { mediaApi } from '../api/media.api';
import { MEDIA_LIMITS, type GalleryItemDto } from '../api/media.types';

export function validateImageFile(
  file: { size: number; type: string; name?: string },
  maxBytes: number = MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
): { valid: boolean; error?: string } {
  const fileName = (file.name || '').toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  // Rejeição clara de HEIC
  if (
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    mimeType.includes('heic') ||
    mimeType.includes('heif')
  ) {
    return {
      valid: false,
      error:
        'O formato HEIC do iPhone não é suportado diretamente. Converta sua foto para JPEG, PNG ou WebP antes de enviar.',
    };
  }

  // Validação de formato permitido
  const isAllowedMime = MEDIA_LIMITS.ALLOWED_MIME_TYPES.includes(mimeType);
  const isAllowedExt = MEDIA_LIMITS.ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(`.${ext}`),
  );

  if (!isAllowedMime && !isAllowedExt) {
    return {
      valid: false,
      error:
        'Formato de arquivo não suportado. Por favor, envie uma imagem nos formatos JPEG, PNG ou WebP.',
    };
  }

  // Validação de tamanho
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `A imagem excede o tamanho máximo permitido de ${maxMb} MB.`,
    };
  }

  return { valid: true };
}

export function useAvatarUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = useCallback(
    async (file: File | Blob, fileName: string, mimeType: string): Promise<string> => {
      setIsUploading(true);
      setError(null);

      try {
        const validation = validateImageFile(
          { size: file.size, type: mimeType, name: fileName },
          MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // 1. Iniciar upload
        const intent = await mediaApi.initiateUpload({
          purpose: 'USER_AVATAR',
          fileName,
          contentType: mimeType,
          fileSize: file.size,
        });

        // 2. Upload direto para a URL pré-assinada
        await mediaApi.uploadToPresignedUrl(intent.uploadUrl, file, mimeType);

        // 3. Confirmar upload
        await mediaApi.confirmUpload(intent.mediaId);

        // 4. Associar ao perfil do usuário
        const { avatarUrl } = await mediaApi.updateUserAvatar(intent.mediaId);

        return avatarUrl;
      } catch (err: any) {
        const msg = err?.message || 'Falha ao atualizar a foto de perfil.';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const removeAvatar = useCallback(async (): Promise<void> => {
    setIsUploading(true);
    setError(null);
    try {
      await mediaApi.removeUserAvatar();
    } catch (err: any) {
      const msg = err?.message || 'Falha ao remover a foto de perfil.';
      setError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isUploading,
    error,
    uploadAvatar,
    removeAvatar,
  };
}

export function useBarbershopMedia(shopId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadLogo = useCallback(
    async (file: File | Blob, fileName: string, mimeType: string): Promise<string> => {
      setIsUploading(true);
      setError(null);

      try {
        const validation = validateImageFile(
          { size: file.size, type: mimeType, name: fileName },
          MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const intent = await mediaApi.initiateUpload({
          purpose: 'BARBERSHOP_LOGO',
          fileName,
          contentType: mimeType,
          fileSize: file.size,
          barbershopId: shopId,
        });

        await mediaApi.uploadToPresignedUrl(intent.uploadUrl, file, mimeType);
        await mediaApi.confirmUpload(intent.mediaId);
        const { avatarUrl } = await mediaApi.updateBarbershopLogo(shopId, intent.mediaId);

        return avatarUrl || '';
      } catch (err: any) {
        const msg = err?.message || 'Falha ao atualizar o logo da barbearia.';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [shopId],
  );

  const removeLogo = useCallback(async (): Promise<void> => {
    setIsUploading(true);
    setError(null);
    try {
      await mediaApi.removeBarbershopLogo(shopId);
    } catch (err: any) {
      const msg = err?.message || 'Falha ao remover o logo da barbearia.';
      setError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [shopId]);

  const uploadGalleryPhoto = useCallback(
    async (
      file: File | Blob,
      fileName: string,
      mimeType: string,
      caption?: string,
      isCover?: boolean,
    ): Promise<GalleryItemDto> => {
      setIsUploading(true);
      setError(null);

      try {
        const validation = validateImageFile(
          { size: file.size, type: mimeType, name: fileName },
          MEDIA_LIMITS.MAX_SPACE_SIZE_BYTES,
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const intent = await mediaApi.initiateUpload({
          purpose: 'BARBERSHOP_GALLERY',
          fileName,
          contentType: mimeType,
          fileSize: file.size,
          barbershopId: shopId,
        });

        await mediaApi.uploadToPresignedUrl(intent.uploadUrl, file, mimeType);
        await mediaApi.confirmUpload(intent.mediaId);
        const { item } = await mediaApi.addGalleryPhoto(
          shopId,
          intent.mediaId,
          caption,
          isCover,
        );

        return item;
      } catch (err: any) {
        const msg = err?.message || 'Falha ao adicionar foto à galeria.';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [shopId],
  );

  return {
    isUploading,
    error,
    uploadLogo,
    removeLogo,
    uploadGalleryPhoto,
  };
}
