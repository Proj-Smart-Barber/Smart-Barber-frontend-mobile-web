import React, { useMemo, useState } from 'react';
import {
  View,
  Modal,
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
}

export function DiscoveryMapModal({
  visible,
  onClose,
  items,
  userCoordinates,
  hasNextPage,
  onFetchNextPage,
  isFetchingNextPage,
}: DiscoveryMapModalProps) {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Filtrar apenas barbearias com coordenadas válidas
  const mappedShops = useMemo(() => {
    return items.filter(
      (s) =>
        s.coordinates &&
        typeof s.coordinates.latitude === 'number' &&
        typeof s.coordinates.longitude === 'number',
    );
  }, [items]);

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
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
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
          {visible && mappedShops.length > 0 && (
            <GoogleMapCanvas
              markers={mapMarkers}
              selectedMarkerId={selectedShopId}
              onSelectMarker={(id) => {
                setSelectedShopId(id);
                handleOpenCatalog(id);
              }}
              userCoordinates={userCoordinates}
              height={200}
              testID="discovery-google-map"
            />
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
      </View>
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
