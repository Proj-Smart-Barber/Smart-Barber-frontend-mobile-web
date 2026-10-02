import { Linking, Platform, Share } from 'react-native';
import { getPublicCatalogUrl } from '@/shared/config/env';

export interface CatalogShareOptions {
  barbershopId?: string | null;
  barbershopName?: string | null;
  onSuccess?: (message: string) => void;
  onError?: (error: Error) => void;
}

export async function sharePublicCatalog({
  barbershopId,
  barbershopName,
  onSuccess,
  onError,
}: CatalogShareOptions): Promise<void> {
  const catalogUrl = getPublicCatalogUrl(barbershopId);
  const shopTitle = barbershopName?.trim() || 'Smart Barber';
  const shareMessage = `Confira os serviços e catálogo oficial da nossa barbearia no Smart Barber: ${catalogUrl}`;

  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `${shopTitle} — Catálogo Oficial`,
            text: shareMessage,
            url: catalogUrl,
          });
          onSuccess?.('Link do catálogo compartilhado com sucesso!');
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            return;
          }
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(catalogUrl);
        onSuccess?.('Link do catálogo copiado para a área de transferência!');
        return;
      }

      onSuccess?.(`Link do catálogo: ${catalogUrl}`);
      return;
    }

    const result = await Share.share({
      title: `${shopTitle} — Catálogo Oficial`,
      message: shareMessage,
      url: catalogUrl,
    });

    if (result.action === Share.sharedAction) {
      onSuccess?.('Link do catálogo compartilhado com sucesso!');
    }
  } catch (error: any) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function openPublicCatalog(barbershopId?: string | null): Promise<void> {
  const url = getPublicCatalogUrl(barbershopId);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    await Linking.openURL(url);
  }
}
