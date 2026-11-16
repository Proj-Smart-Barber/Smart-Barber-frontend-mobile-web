import { Linking, Platform, Share } from 'react-native';
import { getPublicCatalogUrl } from '../config/env';
export async function sharePublicCatalog({ barbershopId, barbershopName, onSuccess, onError, }) {
    var _a;
    const catalogUrl = getPublicCatalogUrl(barbershopId);
    const shopTitle = (barbershopName === null || barbershopName === void 0 ? void 0 : barbershopName.trim()) || 'Smart Barber';
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
                    onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess('Link do catálogo compartilhado com sucesso!');
                    return;
                }
                catch (shareErr) {
                    if ((shareErr === null || shareErr === void 0 ? void 0 : shareErr.name) === 'AbortError') {
                        return;
                    }
                }
            }
            if (typeof navigator !== 'undefined' && ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText)) {
                await navigator.clipboard.writeText(catalogUrl);
                onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess('Link do catálogo copiado para a área de transferência!');
                return;
            }
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(`Link do catálogo: ${catalogUrl}`);
            return;
        }
        const result = await Share.share({
            title: `${shopTitle} — Catálogo Oficial`,
            message: shareMessage,
            url: catalogUrl,
        });
        if (result.action === Share.sharedAction) {
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess('Link do catálogo compartilhado com sucesso!');
        }
    }
    catch (error) {
        onError === null || onError === void 0 ? void 0 : onError(error instanceof Error ? error : new Error(String(error)));
    }
}
export async function openPublicCatalog(barbershopId) {
    const url = getPublicCatalogUrl(barbershopId);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
    else {
        await Linking.openURL(url);
    }
}
