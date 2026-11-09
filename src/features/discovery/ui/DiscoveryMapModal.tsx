import { usePresenceTransition } from '@/shared/ui/use-presence-transition';
import { useReducedMotion, motion } from '@/shared/theme';
import React, { useMemo, useState } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import {
  buildBarbershopCatalogHref,
  type PublicShop,
} from '../api/discovery.contract';
import { formatDistance } from './BarbershopCard';
import { GoogleMapCanvas } from './GoogleMapCanvas';

export interface DiscoveryMapModalProps {
  visible: boolean;
  onClose: () => void;
  items: PublicShop[];
  userCoordinates?: { latitude: number; longitude: number } | null;
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  resultKey?: string;
  resultsError?: Error | null;
  onRetryResults?: () => void;
}

export function DiscoveryMapModal({
  visible,
  onClose,
  items,
  userCoordinates,
  hasNextPage,
  onFetchNextPage,
  isFetchingNextPage,
  resultKey,
  resultsError,
  onRetryResults,
}: DiscoveryMapModalProps) {
  const reducedMotion = useReducedMotion();
  const presence = usePresenceTransition(visible, { enterDuration: motion.slow, exitDuration: motion.standard, reducedMotion });
  const { colors, radius } = useTheme();
  const router = useRouter();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Invalida seleção de marcador se a identidade da busca (resultKey) mudar
  React.useEffect(() => {
    setSelectedShopId(null);
  }, [resultKey]);

  // Filtrar apenas barbearias com coordenadas válidas e finitas (-90..90 lat, -180..180 lng)
  const mappedShops = useMemo(() => {
    return items.filter(
      (s) =>
        s.coordinates &&
        typeof s.coordinates.latitude === 'number' &&
        Number.isFinite(s.coordinates.latitude) &&
        s.coordinates.latitude >= -90 &&
        s.coordinates.latitude <= 90 &&
        typeof s.coordinates.longitude === 'number' &&
        Number.isFinite(s.coordinates.longitude) &&
        s.coordinates.longitude >= -180 &&
        s.coordinates.longitude <= 180,
    );
  }, [items]);

  // Se a barbearia selecionada foi removida da lista filtrada, limpa a seleção
  React.useEffect(() => {
    if (selectedShopId && !mappedShops.some((s) => s.id === selectedShopId)) {
      setSelectedShopId(null);
    }
  }, [mappedShops, selectedShopId]);

  // Validação estrita de coordenadas do usuário (ignora valores inválidos sem inventar posição)
  const sanitizedUserCoords = useMemo(() => {
    if (
      userCoordinates &&
      typeof userCoordinates.latitude === 'number' &&
      Number.isFinite(userCoordinates.latitude) &&
      userCoordinates.latitude >= -90 &&
      userCoordinates.latitude <= 90 &&
      typeof userCoordinates.longitude === 'number' &&
      Number.isFinite(userCoordinates.longitude) &&
      userCoordinates.longitude >= -180 &&
      userCoordinates.longitude <= 180
    ) {
      return userCoordinates;
    }
    return null;
  }, [userCoordinates]);

  const hasPartialList = mappedShops.length < items.length;

  const mapMarkers = useMemo(
    () =>
      mappedShops.map((shop) => ({
        id: shop.id,
        title: shop.name,
        subtitle: shop.location,
        coordinates: shop.coordinates!,
      })),
    [mappedShops],
  );

  const handleOpenCatalog = (shopId: string) => {
    onClose();
    router.push(buildBarbershopCatalogHref(shopId) as any);
  };

  return (
    <Modal
      visible={presence.mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: presence.progress }]}>
        <LiquidGlassView
          variant="card"
          borderRadius={radius.xl}
          style={styles.modalCard}
          contentStyle={styles.modalCardContent}
        >
          {/* Header do Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleCol}>
              <Text variant="h3" weight="bold" style={styles.modalTitle}>
                Barbearias no Mapa
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {mappedShops.length} de {items.length} estabelecimentos com localização
                {hasNextPage ? ' (páginas adicionais disponíveis)' : ''}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar visualização de mapa"
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.surface.input,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </Pressable>
          </View>

          {hasPartialList && (
            <View style={styles.noticeBanner}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.text.secondary}
                style={styles.noticeIcon}
              />
              <Text variant="caption" color={colors.text.secondary} style={styles.noticeText}>
                Algumas barbearias sem coordenadas confirmadas aparecem apenas na lista.
              </Text>
            </View>
          )}

          {/* Superfície de Mapa sob demanda */}
          {presence.mounted && mappedShops.length > 0 && (
            <GoogleMapCanvas
              markers={mapMarkers}
              selectedMarkerId={selectedShopId}
              onSelectMarker={(id) => {
                setSelectedShopId(id);
                handleOpenCatalog(id);
              }}
              userCoordinates={sanitizedUserCoords}
              height={200}
              testID="discovery-google-map"
            />
          )}

          {resultsError && (
            <View style={[styles.noticeBanner, { borderColor: colors.feedback.error }]}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.feedback.error}
                style={styles.noticeIcon}
              />
              <Text
                variant="caption"
                color={colors.feedback.error}
                style={[styles.noticeText, { flex: 1 }]}
              >
                Erro ao atualizar estabelecimentos no mapa. Unidades carregadas continuam disponíveis.
              </Text>
              {onRetryResults && (
                <Pressable
                  onPress={onRetryResults}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar novamente carregar unidades no mapa"
                  style={{ marginLeft: 8 }}
                >
                  <Text variant="caption" weight="bold" color={colors.brand.primary}>
                    Tentar de novo
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Lista de Pins e Estabelecimentos */}
          <ScrollView
            style={styles.itemsScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {mappedShops.map((shop) => {
              const dist = formatDistance(shop.distanceMeters);
              const isSelected = selectedShopId === shop.id;
              return (
                <Pressable
                  key={shop.id}
                  onPress={() => handleOpenCatalog(shop.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir barbearia ${shop.name}`}
                  style={[
                    styles.shopPinCard,
                    {
                      backgroundColor: isSelected
                        ? colors.surface.selected
                        : colors.surface.default,
                      borderColor: isSelected
                        ? colors.brand.primary
                        : colors.border.subtle,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <View style={styles.pinIconWrapper}>
                    <Ionicons name="location" size={22} color={colors.brand.primary} />
                  </View>
                  <View style={styles.pinDetails}>
                    <Text variant="body" weight="medium" numberOfLines={1} style={styles.pinTitle}>
                      {shop.name}
                    </Text>
                    <Text
                      variant="caption"
                      color={colors.text.secondary}
                      numberOfLines={1}
                    >
                      {shop.location}
                    </Text>
                    {dist && (
                      <Text
                        variant="caption"
                        style={[styles.pinDistance, { color: colors.brand.primary }]}
                      >
                        {dist}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.text.secondary}
                  />
                </Pressable>
              );
            })}
            {hasNextPage && onFetchNextPage ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Button
                  title="Carregar mais unidades para o mapa"
                  variant="outline"
                  loading={isFetchingNextPage}
                  onPress={onFetchNextPage}
                />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Voltar para a lista"
              variant="outline"
              onPress={onClose}
              style={styles.footerButton}
            />
          </View>
        </LiquidGlassView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '85%',
  },
  modalCardContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    marginBottom: 12,
  },
  noticeIcon: {
    marginRight: 6,
  },
  noticeText: {
    flex: 1,
  },
  itemsScroll: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingVertical: 6,
    gap: 8,
  },
  shopPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  pinIconWrapper: {
    marginRight: 12,
  },
  pinDetails: {
    flex: 1,
  },
  pinTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  pinDistance: {
    fontWeight: '600',
    marginTop: 2,
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerButton: {
    width: '100%',
  },
});
