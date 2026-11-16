import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../auth/model/use-session';
import { barbershopApi } from '../api/barbershop.api';
import { servicesApi } from '../../services/api/services.api';
import { mediaApi } from '../../media/api/media.api';
import { useBarbershopReviews } from '../../reviews/model/use-reviews';
import { getPublicCatalogUrl } from '../../../shared/config/env';
export function useOwnerProfilePreview() {
    var _a, _b;
    const { barbershop: sessionShop, token, selectedShopId } = useSession();
    const shopId = (sessionShop === null || sessionShop === void 0 ? void 0 : sessionShop.id) || selectedShopId || '';
    // 1. Detalhes completos da barbearia
    const { data: shopDetails, isLoading: isLoadingShop, refetch: refetchShop, } = useQuery({
        queryKey: ['barbershop', 'owner-preview', shopId],
        queryFn: () => barbershopApi.getBarbershop(shopId, token),
        enabled: Boolean(shopId),
        staleTime: 30000,
    });
    // 2. Serviços da barbearia
    const { data: servicesData, isLoading: isLoadingServices, refetch: refetchServices, } = useQuery({
        queryKey: ['services', 'owner-preview', shopId],
        queryFn: () => servicesApi.listServices(shopId, { limit: 100, includeInactive: true }),
        enabled: Boolean(shopId),
        staleTime: 30000,
    });
    // 3. Galeria de fotos do espaço
    const { data: galleryItems = [], isLoading: isLoadingGallery, refetch: refetchGallery, } = useQuery({
        queryKey: ['gallery', 'owner-preview', shopId],
        queryFn: () => mediaApi.getBarbershopGallery(shopId),
        enabled: Boolean(shopId),
        staleTime: 30000,
    });
    // 4. Avaliações
    const { data: reviewsData, isLoading: isLoadingReviews, refetch: refetchReviews, } = useBarbershopReviews(shopId);
    const rating = (_a = reviewsData === null || reviewsData === void 0 ? void 0 : reviewsData.averageRating) !== null && _a !== void 0 ? _a : null;
    const reviewCount = (_b = reviewsData === null || reviewsData === void 0 ? void 0 : reviewsData.reviewCount) !== null && _b !== void 0 ? _b : 0;
    const shopName = (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.name) || (sessionShop === null || sessionShop === void 0 ? void 0 : sessionShop.name) || 'Barbearia';
    const avatarUrl = (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.avatarUrl) || (sessionShop === null || sessionShop === void 0 ? void 0 : sessionShop.avatarUrl) || null;
    const coverUrl = (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.coverUrl) || (sessionShop === null || sessionShop === void 0 ? void 0 : sessionShop.coverUrl) || null;
    const location = (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.location) || 'Localização não cadastrada';
    const googleMapsUrl = (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.googleMapsUrl) || (sessionShop === null || sessionShop === void 0 ? void 0 : sessionShop.googleMapsUrl) || null;
    const allServices = (servicesData === null || servicesData === void 0 ? void 0 : servicesData.items) || [];
    const activeServices = allServices.filter((s) => s.isActive);
    const featuredServices = allServices
        .filter((s) => s.isFeatured && s.isActive)
        .sort((a, b) => { var _a, _b; return ((_a = a.featuredOrder) !== null && _a !== void 0 ? _a : 0) - ((_b = b.featuredOrder) !== null && _b !== void 0 ? _b : 0); });
    // Checklist de Prontidão
    const checklist = useMemo(() => {
        return [
            {
                id: 'logo',
                label: 'Foto de Perfil / Logotipo',
                description: avatarUrl
                    ? 'Logotipo oficial configurado e visível na busca e catálogo.'
                    : 'Adicione o logotipo da barbearia para identificação imediata.',
                isComplete: Boolean(avatarUrl),
                actionRoute: '/(app)/settings',
                actionLabel: avatarUrl ? 'Alterar' : 'Adicionar',
            },
            {
                id: 'cover',
                label: 'Foto de Capa / Fachada',
                description: coverUrl
                    ? 'Foto de capa exibida no topo do catálogo oficial e cartão.'
                    : 'Adicione uma foto de capa de alta qualidade para atrair clientes.',
                isComplete: Boolean(coverUrl),
                actionRoute: '/(app)/settings',
                actionLabel: coverUrl ? 'Alterar' : 'Adicionar',
            },
            {
                id: 'gallery',
                label: 'Galeria do Espaço (Ambiente)',
                description: galleryItems.length >= 2
                    ? `${galleryItems.length} fotos do espaço cadastradas na galeria.`
                    : galleryItems.length === 1
                        ? '1 foto cadastrada. Recomendamos adicionar mais fotos do ambiente.'
                        : 'Nenhuma foto do ambiente cadastrada para os clientes verem seu espaço.',
                isComplete: galleryItems.length >= 2,
                actionRoute: '/(app)/settings',
                actionLabel: galleryItems.length > 0 ? 'Gerenciar' : 'Adicionar fotos',
            },
            {
                id: 'services',
                label: 'Catálogo de Serviços Ativos',
                description: activeServices.length > 0
                    ? `${activeServices.length} serviço(s) ativo(s) com preços e durações configurados.`
                    : 'Cadastre ao menos um serviço ativo para habilitar agendamentos.',
                isComplete: activeServices.length > 0,
                actionRoute: '/(app)/services',
                actionLabel: activeServices.length > 0 ? 'Ver serviços' : 'Cadastrar serviço',
            },
            {
                id: 'featured',
                label: 'Destaques com Foto no Feed Explorar',
                description: featuredServices.length > 0
                    ? `${featuredServices.length} serviço(s) em destaque exibidos no Feed Explorar.`
                    : 'Defina serviços em destaque com foto para aparecer no Feed Explorar.',
                isComplete: featuredServices.length > 0,
                actionRoute: '/(app)/services',
                actionLabel: featuredServices.length > 0 ? 'Gerenciar destaques' : 'Destacar serviços',
            },
            {
                id: 'location',
                label: 'Endereço e Link do Google Maps',
                description: (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.location) && googleMapsUrl
                    ? 'Endereço e rota direta para o Google Maps / GPS confirmados.'
                    : (shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.location)
                        ? 'Endereço informado, mas o link do Google Maps ainda não foi inserido.'
                        : 'Endereço da barbearia não preenchido.',
                isComplete: Boolean((shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.location) && googleMapsUrl),
                actionRoute: '/(app)/settings',
                actionLabel: 'Configurar endereço',
            },
        ];
    }, [avatarUrl, coverUrl, galleryItems, activeServices, featuredServices, shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.location, googleMapsUrl]);
    const completedCount = checklist.filter((item) => item.isComplete).length;
    const readinessPercent = Math.round((completedCount / checklist.length) * 100);
    // Composição da Mídia do Feed Explorar (até 6 itens: serviços em destaque + galeria do espaço)
    const previewExploreMedia = useMemo(() => {
        var _a, _b, _c;
        const list = [];
        // Primeiro os serviços destacados
        for (const service of featuredServices) {
            if (list.length >= 6)
                break;
            const mediaUrl = service.imageUrl;
            if (mediaUrl) {
                list.push({
                    id: `svc-media-${service.id}`,
                    kind: 'service',
                    mediaId: service.id,
                    url: mediaUrl,
                    width: 1080,
                    height: 1350,
                    alt: service.title,
                    category: 'SERVIÇO',
                    service: {
                        id: service.id,
                        title: service.title,
                        priceInCents: service.priceInCents,
                        durationInMinutes: service.durationInMinutes,
                        rating: (_a = service.rating) !== null && _a !== void 0 ? _a : null,
                        reviewCount: (_b = service.reviewCount) !== null && _b !== void 0 ? _b : 0,
                    },
                });
            }
        }
        // Slots restantes preenchidos pela galeria do espaço
        const sortedGallery = [...galleryItems].sort((a, b) => {
            var _a, _b;
            if (a.isCover && !b.isCover)
                return -1;
            if (!a.isCover && b.isCover)
                return 1;
            return ((_a = a.displayOrder) !== null && _a !== void 0 ? _a : 0) - ((_b = b.displayOrder) !== null && _b !== void 0 ? _b : 0);
        });
        for (const item of sortedGallery) {
            if (list.length >= 6)
                break;
            const url = (_c = item.posterUrl) !== null && _c !== void 0 ? _c : item.publicUrl;
            if (url && !list.some((m) => m.url === url)) {
                list.push({
                    id: `gal-${item.id}`,
                    kind: 'environment',
                    mediaId: item.id,
                    url,
                    posterUrl: item.posterUrl,
                    mimeType: item.mimeType,
                    width: 1080,
                    height: 1350,
                    alt: item.caption || `${shopName} - Espaço`,
                    category: 'AMBIENTE',
                    service: null,
                });
            }
        }
        // Fallback se não houver mídia: foto de capa ou placeholder de marca
        if (list.length === 0) {
            const fallbackUrl = coverUrl || avatarUrl || '';
            list.push({
                id: `fallback-cover`,
                kind: 'environment',
                mediaId: 'cover',
                url: fallbackUrl,
                width: 1080,
                height: 1350,
                alt: `${shopName} - Capa`,
                category: 'AMBIENTE',
                service: null,
            });
        }
        return list;
    }, [featuredServices, galleryItems, coverUrl, avatarUrl, shopName]);
    // Objeto ExploreFeedItem para a aba Feed Explorar
    const previewExploreItem = useMemo(() => {
        return {
            barbershop: {
                id: shopId,
                slug: shopId,
                name: shopName,
                location,
                logoUrl: avatarUrl,
                rating,
                reviewCount,
                googleMapsUrl,
            },
            distanceMeters: null,
            distanceBasis: 'unavailable',
            rankingScore: {
                score: 1,
                reputationComponent: rating !== null && rating !== void 0 ? rating : 5,
                bayesRating: rating !== null && rating !== void 0 ? rating : 5,
            },
            media: previewExploreMedia,
        };
    }, [shopId, shopName, location, avatarUrl, rating, reviewCount, googleMapsUrl, previewExploreMedia]);
    // Objeto PublicShop para a aba Card de Busca
    const previewPublicShop = useMemo(() => {
        var _a;
        const photos = [];
        if (coverUrl)
            photos.push(coverUrl);
        for (const g of galleryItems) {
            const u = (_a = g.posterUrl) !== null && _a !== void 0 ? _a : g.publicUrl;
            if (u && !photos.includes(u))
                photos.push(u);
        }
        const featured = featuredServices.slice(0, 3).map((s) => {
            var _a, _b;
            return ({
                id: s.id,
                title: s.title,
                priceInCents: s.priceInCents,
                durationInMinutes: s.durationInMinutes,
                imageUrl: s.imageUrl || null,
                rating: (_a = s.rating) !== null && _a !== void 0 ? _a : null,
                reviewCount: (_b = s.reviewCount) !== null && _b !== void 0 ? _b : 0,
            });
        });
        return {
            id: shopId,
            name: shopName,
            slug: shopId,
            location,
            avatarUrl,
            coverUrl,
            photos,
            googleMapsUrl,
            rating,
            reviewCount,
            featuredServices: featured,
            coordinates: null,
            distanceMeters: null,
        };
    }, [shopId, shopName, location, avatarUrl, coverUrl, galleryItems, googleMapsUrl, rating, reviewCount, featuredServices]);
    const publicCatalogUrl = getPublicCatalogUrl(shopId);
    const refetchAll = () => {
        void refetchShop();
        void refetchServices();
        void refetchGallery();
        void refetchReviews();
    };
    return {
        shopId,
        shopName,
        avatarUrl,
        coverUrl,
        location,
        googleMapsUrl,
        rating,
        reviewCount,
        checklist,
        completedCount,
        totalCount: checklist.length,
        readinessPercent,
        previewExploreItem,
        previewPublicShop,
        publicCatalogUrl,
        isLoading: isLoadingShop || isLoadingServices || isLoadingGallery || isLoadingReviews,
        refetchAll,
    };
}
