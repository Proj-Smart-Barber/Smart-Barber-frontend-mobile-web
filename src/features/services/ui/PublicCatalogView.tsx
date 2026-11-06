import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
  Linking,
  Pressable,
  Image,
  Modal,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { BrandMark } from '@/shared/brand';
import { Text, Badge, EmptyState, ErrorState, Skeleton, LoadingRegion } from '@/shared/ui';
import { usePublicServices } from '../model/use-public-services';
import { ServiceCard } from './ServiceCard';
import { SelectedServicesSummary } from './SelectedServicesSummary';
import { BarbershopGalleryViewer, mediaApi } from '@/features/media';
import { BarbershopReviewsList, useBarbershopReviews } from '@/features/reviews';
import { BarbershopPhotoCarousel } from '@/features/discovery';

export interface PublicCatalogViewProps {
  barbershopId: string;
}

export function PublicCatalogView({ barbershopId }: PublicCatalogViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceId?: string }>();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();

  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);

  const {
    barbershop,
    services,
    isLoading,
    isRefetching,
    error,
    refetch,
    selectedServices,
    totalPriceInCents,
    totalDurationInMinutes,
    toggleService,
    isSelected,
    clearSelection,
    isHandoffModalOpen,
    openHandoffModal,
    closeHandoffModal,
  } = usePublicServices(
    barbershopId,
    typeof params.serviceId === 'string' ? params.serviceId : undefined,
  );

  // Consulta da galeria de fotos do espaço
  const { data: galleryItems = [] } = useQuery({
    queryKey: ['gallery', barbershopId],
    queryFn: () => mediaApi.getBarbershopGallery(barbershopId),
    enabled: Boolean(barbershopId),
    staleTime: 1000 * 60 * 2,
  });

  // Consulta autoritativa das avaliações para o badge no cabeçalho
  const { data: reviewsData } = useBarbershopReviews(barbershopId);
  const rating = reviewsData?.averageRating ?? null;
  const reviewCount = reviewsData?.reviewCount ?? 0;

  // Lista normalizada de fotos para o carrossel do topo
  const heroPhotos = useMemo<string[]>(() => {
    const list: string[] = [];
    if (galleryItems && galleryItems.length > 0) {
      for (const item of galleryItems) {
        if (
          (item.posterUrl ?? item.publicUrl) &&
          !list.includes((item.posterUrl ?? item.publicUrl)!)
        ) {
          list.push((item.posterUrl ?? item.publicUrl)!);
        }
      }
    }
    if (barbershop?.coverUrl && !list.includes(barbershop.coverUrl)) {
      list.unshift(barbershop.coverUrl);
    }
    return list;
  }, [galleryItems, barbershop?.coverUrl]);

  // Ação de voltar para a tela anterior com fallback seguro
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(client)/explore');
    }
  };

  // Encaminhamento direto para aplicativo de GPS / Google Maps
  const handleOpenGps = () => {
    if (barbershop?.googleMapsUrl && barbershop.googleMapsUrl.trim()) {
      void Linking.openURL(barbershop.googleMapsUrl.trim());
      return;
    }
    const destination = [barbershop?.name, barbershop?.location].filter(Boolean).join(', ');
    if (!destination) return;
    const encoded = encodeURIComponent(destination);
    const url = Platform.select({
      ios: `maps://?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    void Linking.openURL(url).catch(() => {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    });
  };

  const webBackgroundStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(11, 11, 11, 0.98) 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        } as any)
      : null;

  return (
    <View
      style={[
        styles.rootContainer,
        {
          backgroundColor: colors.background.primary,
        },
        webBackgroundStyle,
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: selectedServices.length > 0 ? 140 : insets.bottom + spacing[6],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* 1. TOPO: Carrossel de fotos do espaço + Botão Voltar + Badge Oficial */}
        <View style={styles.heroSection}>
          <BarbershopPhotoCarousel
            photos={heroPhotos}
            coverUrl={barbershop?.coverUrl}
            barbershopName={barbershop?.name || 'Barbearia'}
            height={isCompact ? 240 : 300}
            maxPhotos={10}
            onPhotoPress={(url) => setFullscreenPhotoUrl(url)}
            style={styles.heroCarousel}
          />

          {/* Botão de Voltar Flutuante */}
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar para a página anterior"
            hitSlop={10}
            style={({ pressed }) => [
              styles.floatingBackButton,
              {
                top: Math.max(insets.top, 16),
                backgroundColor: pressed ? 'rgba(0, 0, 0, 0.85)' : 'rgba(15, 15, 15, 0.70)',
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>

          {/* Badge Oficial Flutuante */}
          <View
            style={[
              styles.floatingBadgeWrapper,
              {
                top: Math.max(insets.top, 16),
                backgroundColor: 'rgba(15, 15, 15, 0.70)',
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <Badge label="Catálogo Oficial" tone="neutral" />
          </View>
        </View>

        {/* 2. CABEÇALHO REESTILIZADO: Logo, Nome, Reputação, Endereço e Ação GPS */}
        <View style={styles.contentConstraint}>
          <LiquidGlassView
            variant="card"
            borderRadius={radius.xl}
            style={styles.headerCardOuter}
            contentStyle={styles.headerCardContent}
          >
            {/* Linha Topo: Logo da Barbearia + Nome e Avaliação */}
            <View style={styles.headerTopRow}>
              <View
                style={[
                  styles.avatarWrapper,
                  {
                    borderRadius: radius.lg,
                    backgroundColor: colors.surface.input,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                {barbershop?.avatarUrl ? (
                  <Image
                    source={{ uri: barbershop.avatarUrl }}
                    style={styles.avatarImage}
                    resizeMode="contain"
                  />
                ) : (
                  <BrandMark
                    variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                    size={36}
                    decorative
                  />
                )}
              </View>

              <View style={styles.headerTitleColumn}>
                <Text variant="h2" weight="bold" color={colors.text.primary} numberOfLines={2}>
                  {barbershop ? barbershop.name : 'Barbearia'}
                </Text>

                {/* Badge de Avaliação no Topo */}
                {reviewCount > 0 && rating != null ? (
                  <View
                    style={[
                      styles.ratingBadge,
                      {
                        backgroundColor: 'rgba(217, 119, 6, 0.15)',
                        borderColor: 'rgba(217, 119, 6, 0.3)',
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Ionicons name="star" size={13} color="#f59e0b" />
                    <Text
                      variant="caption"
                      weight="bold"
                      style={{ color: '#fbbf24', marginLeft: 4 }}
                    >
                      {rating.toFixed(1)}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary} style={{ marginLeft: 4 }}>
                      ({reviewCount} {reviewCount === 1 ? 'avaliação' : 'avaliações'})
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.ratingBadge,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text variant="caption" color={colors.text.secondary}>
                      Sem avaliações ainda
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Endereço de Fácil Visualização */}
            {barbershop?.location ? (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.brand.primary}
                  style={styles.locationIcon}
                />
                <Text variant="bodySm" color={colors.text.primary} style={styles.locationText}>
                  {barbershop.location}
                </Text>
              </View>
            ) : null}

            {/* Botão Direto para GPS / Google Maps */}
            <Pressable
              onPress={handleOpenGps}
              accessibilityRole="button"
              accessibilityLabel={`Abrir rota para a barbearia ${barbershop?.name || ''} no aplicativo de mapas e GPS`}
              style={({ pressed }) => [
                styles.gpsButton,
                {
                  backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                  borderColor: colors.border.default,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons name="navigate-circle-outline" size={20} color={colors.brand.primary} />
              <Text
                variant="bodySm"
                weight="bold"
                color={colors.text.primary}
                style={styles.gpsButtonText}
              >
                Como chegar (Abrir no GPS / Maps)
              </Text>
              <Ionicons name="open-outline" size={14} color={colors.text.secondary} />
            </Pressable>
          </LiquidGlassView>

          {/* 3. SEÇÃO: SERVIÇOS PARA AGENDAMENTO */}
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeader}>
              <Text variant="h3" weight="bold" color={colors.text.primary}>
                Serviços Disponíveis
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                Selecione um ou mais serviços abaixo para iniciar seu agendamento.
              </Text>
            </View>

            {isLoading ? (
              <LoadingRegion
                phase="initial"
                busy={true}
                accessibilityLabel="Carregando serviços disponíveis"
                placeholder={
                  <View style={{ gap: spacing[3] }}>
                    <Skeleton height={108} borderRadius={radius.lg} />
                    <Skeleton height={108} borderRadius={radius.lg} />
                    <Skeleton height={108} borderRadius={radius.lg} />
                  </View>
                }
              />
            ) : error ? (
              <ErrorState
                title="Não foi possível carregar os serviços"
                description={
                  error instanceof Error
                    ? error.message
                    : 'Ocorreu um erro ao consultar o catálogo da barbearia.'
                }
                onRetry={() => {
                  void refetch();
                }}
              />
            ) : services.length === 0 ? (
              <EmptyState
                title="Catálogo indisponível"
                description="Esta barbearia ainda não possui serviços ativos disponíveis para agendamento online."
              />
            ) : (
              <View style={{ gap: spacing[2] }}>
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={isSelected(service.id)}
                    onSelect={() => toggleService(service.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* 4. SEÇÃO: GALERIA DO ESPAÇO */}
          {galleryItems.length > 0 && (
            <View style={styles.gallerySection}>
              <BarbershopGalleryViewer items={galleryItems} barbershopId={barbershopId} />
            </View>
          )}

          {/* 5. SEÇÃO: AVALIAÇÕES (FICA POR ÚLTIMO CONFORME SOLICITADO) */}
          <View style={styles.reviewsSection}>
            <BarbershopReviewsList barbershopId={barbershopId} />
          </View>
        </View>
      </ScrollView>

      {/* 6. MODAL PARA VISUALIZAÇÃO AMPLIADA DE FOTOS */}
      <Modal
        visible={Boolean(fullscreenPhotoUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenPhotoUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setFullscreenPhotoUrl(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar visualização da foto"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {fullscreenPhotoUrl ? (
            <Image
              source={{ uri: fullscreenPhotoUrl }}
              style={styles.modalFullImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* 7. RESUMO FLUTUANTE DE SERVIÇOS SELECIONADOS */}
      <SelectedServicesSummary
        selectedServices={selectedServices}
        totalPriceInCents={totalPriceInCents}
        totalDurationInMinutes={totalDurationInMinutes}
        onClear={clearSelection}
        isModalOpen={isHandoffModalOpen}
        onOpenModal={openHandoffModal}
        onCloseModal={closeHandoffModal}
        onProceed={() => {
          if (selectedServices.length === 0) return;
          router.push({
            pathname: '/barbershops/[shopId]/book' as any,
            params: {
              shopId: barbershopId,
              serviceIds: selectedServices.map((s) => s.id).join(','),
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    position: 'relative',
    width: '100%',
  },
  heroCarousel: {
    width: '100%',
  },
  floatingBackButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 8,
  },
  floatingBadgeWrapper: {
    position: 'absolute',
    right: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
    elevation: 8,
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  headerCardOuter: {
    marginTop: -28,
    marginBottom: 20,
    width: '100%',
    zIndex: 10,
  },
  headerCardContent: {
    padding: 18,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerTitleColumn: {
    flex: 1,
    gap: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 2,
  },
  locationIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  locationText: {
    flex: 1,
    lineHeight: 20,
  },
  gpsButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  gpsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsButtonText: {
    flex: 1,
  },
  servicesSection: {
    gap: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    gap: 3,
    marginBottom: 4,
  },
  gallerySection: {
    marginBottom: 24,
  },
  reviewsSection: {
    marginBottom: 28,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFullImage: {
    width: '100%',
    height: '80%',
  },
});
