import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
  TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { BrandMark } from '@/shared/brand';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { usePublicServices } from '@/features/services/model/use-public-services';
import { BarbershopReviewsList } from '@/features/reviews/ui/BarbershopReviewsList';
import { LocationStatusPanel } from './location-status-panel';
import { locationStore } from '../model/location-provider';
import type { ExploreFeedItem, ExploreFeedMediaItem } from '../api/explore-feed.contract';
import type { DiscoveryMode, DiscoveryRadius } from '../model/discovery.types';

// React Native Web depende de animationend para liberar a camada modal.
const sheetAnimation = Platform.OS === 'web' ? 'none' : 'fade';

// ==========================================
// 1. Sheet: Detalhes do Serviço Ativo
// ==========================================
export interface ExploreServiceSheetProps {
  visible: boolean;
  item: ExploreFeedItem | null;
  activeMedia: ExploreFeedMediaItem | null;
  onClose: () => void;
}

export function ExploreServiceSheet({
  visible,
  item,
  activeMedia,
  onClose,
}: ExploreServiceSheetProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Escape key handler on web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!item || !activeMedia) return null;

  const service = activeMedia.service;

  const handleBook = () => {
    onClose();
    router.push(
      `/barbershops/${item.barbershop.id}/services${service ? `?serviceId=${encodeURIComponent(service.id)}` : ''}` as any,
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheetAnimation}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar detalhes do serviço"
        />

        <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#141416' : '#ffffff' }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetCategoryText, { color: colors.brand.primary }]}>
                {activeMedia.category?.toUpperCase() || 'SERVIÇO'}
              </Text>
              <Text
                style={[styles.sheetTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}
              >
                {service ? service.title : 'Ambiente e Estrutura'}
              </Text>
              <Text style={styles.sheetShopSubtitle}>{item.barbershop.name}</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons name="close" size={22} color={isDark ? '#e0e0e0' : colors.text.primary} />
            </Pressable>
          </View>

          {/* Conteúdo */}
          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {service ? (
              <View style={styles.priceDurationHighlight}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceTag, { color: colors.brand.primary }]}>
                    {`R$ ${(service.priceInCents / 100).toFixed(2).replace('.', ',')}`}
                  </Text>
                  <Text style={[styles.durationBadge, { color: isDark ? '#a0a0a0' : '#666' }]}>
                    {`⏱ ${service.durationInMinutes} min`}
                  </Text>
                </View>
                <Text style={[styles.serviceDescription, { color: isDark ? '#cccccc' : '#444' }]}>
                  Atendimento especializado com produtos de alta performance e acabamento
                  profissional.
                </Text>
              </View>
            ) : (
              <View style={styles.priceDurationHighlight}>
                <Text style={[styles.serviceDescription, { color: isDark ? '#cccccc' : '#444' }]}>
                  {item.barbershop.name} conta com ambiente confortável, climatizado e estrutura
                  completa para proporcionar a melhor experiência de cuidado pessoal.
                </Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color="#888" />
              <Text style={[styles.metaText, { color: isDark ? '#a0a0a0' : '#666' }]}>
                {item.barbershop.location}
              </Text>
            </View>
          </ScrollView>

          {/* CTA Footer */}
          <View style={styles.sheetFooter}>
            <Button
              variant="primary"
              title={service ? 'Agendar este serviço' : 'Ver todos os serviços'}
              onPress={handleBook}
              style={{ width: '100%', minHeight: 48 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 2. Sheet: Catálogo Completo da Barbearia
// ==========================================
export interface ExploreCatalogSheetProps {
  visible: boolean;
  item: ExploreFeedItem | null;
  onClose: () => void;
}

export function ExploreCatalogSheet({ visible, item, onClose }: ExploreCatalogSheetProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const { services, isLoading } = usePublicServices(item?.barbershop.id);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!item) return null;

  const handleOpenFullCatalog = () => {
    onClose();
    router.push(`/barbershops/${item.barbershop.id}/services` as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheetAnimation}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar catálogo"
        />

        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#141416' : '#ffffff', maxHeight: '80%' },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetCategoryText, { color: colors.brand.primary }]}>
                CATÁLOGO DE SERVIÇOS
              </Text>
              <Text
                style={[styles.sheetTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}
              >
                {item.barbershop.name}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons name="close" size={22} color={isDark ? '#e0e0e0' : colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Spinner size="large" />
              </View>
            ) : services && services.length > 0 ? (
              <View style={{ gap: 10, paddingBottom: 16 }}>
                {services.map((srv: any) => (
                  <View
                    key={srv.id}
                    style={[
                      styles.catalogServiceCard,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f7',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea',
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.catalogServiceTitle,
                          { color: isDark ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        {srv.title}
                      </Text>
                      {srv.description ? (
                        <Text
                          style={[
                            styles.catalogServiceDesc,
                            { color: isDark ? '#a0a0a0' : '#666' },
                          ]}
                          numberOfLines={2}
                        >
                          {srv.description}
                        </Text>
                      ) : null}
                      <Text style={[styles.catalogServiceMeta, { color: colors.brand.primary }]}>
                        {`R$ ${(srv.priceInCents / 100).toFixed(2).replace('.', ',')} · ${srv.durationInMinutes} min`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>Nenhum serviço disponível no momento.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Button
              variant="primary"
              title="Ver catálogo completo & Agendar"
              onPress={handleOpenFullCatalog}
              style={{ width: '100%', minHeight: 48 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 3. Sheet: Sobre a Barbearia & Localização
// ==========================================
export interface ExploreAboutSheetProps {
  visible: boolean;
  item: ExploreFeedItem | null;
  onClose: () => void;
}

export function ExploreAboutSheet({ visible, item, onClose }: ExploreAboutSheetProps) {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!item) return null;

  const handleOpenGps = async () => {
    const address = item.barbershop.location;
    if (item.barbershop.googleMapsUrl) {
      try {
        await Linking.openURL(item.barbershop.googleMapsUrl);
        return;
      } catch {
        // Fallback
      }
    }

    const encoded = encodeURIComponent(address);
    const nativeUrl =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${encoded}`
        : Platform.OS === 'android'
          ? `geo:0,0?q=${encoded}`
          : `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    try {
      await Linking.openURL(nativeUrl);
    } catch {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheetAnimation}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar detalhes sobre a barbearia"
        />

        <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#141416' : '#ffffff' }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetCategoryText, { color: colors.brand.primary }]}>
                INFORMAÇÕES DA UNIDADE
              </Text>
              <Text
                style={[styles.sheetTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}
              >
                {item.barbershop.name}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons name="close" size={22} color={isDark ? '#e0e0e0' : colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <View style={styles.aboutCard}>
              <View style={styles.aboutRow}>
                <Ionicons name="location-sharp" size={20} color={colors.brand.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aboutLabel, { color: isDark ? '#ffffff' : '#111' }]}>
                    Endereço
                  </Text>
                  <Text style={[styles.aboutValue, { color: isDark ? '#a0a0a0' : '#666' }]}>
                    {item.barbershop.location}
                  </Text>
                </View>
              </View>

              <View style={styles.aboutRow}>
                <Ionicons name="star" size={18} color="#ffb800" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aboutLabel, { color: isDark ? '#ffffff' : '#111' }]}>
                    Avaliação dos Clientes
                  </Text>
                  <Text style={[styles.aboutValue, { color: isDark ? '#a0a0a0' : '#666' }]}>
                    {item.barbershop.rating
                      ? `${item.barbershop.rating.toFixed(1)} estrelas (${item.barbershop.reviewCount} avaliações reais)`
                      : 'Sem avaliações publicadas ainda'}
                  </Text>
                </View>
              </View>

              <View style={styles.aboutRow}>
                <Ionicons name="time-outline" size={20} color={colors.brand.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aboutLabel, { color: isDark ? '#ffffff' : '#111' }]}>
                    Horário de Atendimento
                  </Text>
                  <Text style={[styles.aboutValue, { color: isDark ? '#a0a0a0' : '#666' }]}>
                    Terça a Sábado: 09:00 às 20:00{'\n'}Domingo e Segunda: Fechado
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Button
              variant="primary"
              title="Como chegar (Abrir no GPS / Maps)"
              onPress={handleOpenGps}
              style={{ width: '100%', minHeight: 48 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 4. Sheet: Avaliações Publicadas
// ==========================================
export interface ExploreReviewsSheetProps {
  visible: boolean;
  item: ExploreFeedItem | null;
  onClose: () => void;
}

export function ExploreReviewsSheet({ visible, item, onClose }: ExploreReviewsSheetProps) {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheetAnimation}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar avaliações"
        />

        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#141416' : '#ffffff', maxHeight: '85%' },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetCategoryText, { color: colors.brand.primary }]}>
                AVALIAÇÕES DOS CLIENTES
              </Text>
              <Text
                style={[styles.sheetTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}
              >
                {item.barbershop.name}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons name="close" size={22} color={isDark ? '#e0e0e0' : colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <BarbershopReviewsList barbershopId={item.barbershop.id} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 5. Sheet: Filtros de Busca e Raio
// ==========================================
export interface ExploreFilterSheetProps {
  visible: boolean;
  mode: DiscoveryMode;
  radiusKm: DiscoveryRadius;
  searchQuery: string;
  isLocationGranted: boolean;
  regionKey?: string;
  onClose: () => void;
  onApplyFilters: (
    mode: DiscoveryMode,
    radius: DiscoveryRadius,
    query: string,
    region?: string,
  ) => void;
}

export function ExploreFilterSheet({
  visible,
  mode,
  radiusKm,
  searchQuery,
  isLocationGranted,
  regionKey = '',
  onClose,
  onApplyFilters,
}: ExploreFilterSheetProps) {
  const { colors, isDark } = useTheme();
  const [region, setRegion] = React.useState(regionKey);
  const [selectedMode, setSelectedMode] = React.useState<DiscoveryMode>(mode);
  const [selectedRadius, setSelectedRadius] = React.useState<DiscoveryRadius>(radiusKm);
  const [query, setQuery] = React.useState(searchQuery);

  React.useEffect(() => {
    setRegion(regionKey);
    setSelectedMode(mode);
    setSelectedRadius(radiusKm);
    setQuery(searchQuery);
  }, [mode, radiusKm, searchQuery, visible, regionKey]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const handleApply = () => {
    if (region.trim()) onApplyFilters('ALL', selectedRadius, query, region.trim());
    else onApplyFilters(selectedMode, selectedRadius, query);
    onClose();
  };

  const handleReset = () => {
    setSelectedMode('ALL');
    setSelectedRadius(10);
    setQuery('');
    setRegion('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheetAnimation}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar filtros"
        />

        <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#141416' : '#ffffff' }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetCategoryText, { color: colors.brand.primary }]}>
                FILTROS DO FEED
              </Text>
              <Text
                style={[styles.sheetTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}
              >
                Personalizar Busca
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons name="close" size={22} color={isDark ? '#e0e0e0' : colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Campo de Busca */}
            <View style={{ gap: 6, marginBottom: 16 }}>
              <Text style={[styles.filterSectionLabel, { color: isDark ? '#e0e0e0' : '#222' }]}>
                Buscar por nome ou endereço
              </Text>
              <View
                style={[
                  styles.filterSearchInputWrap,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f3',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#d0d0d5',
                  },
                ]}
              >
                <Ionicons name="search" size={18} color="#888" />
                <RNTextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Ex: Mooca, Corte degradê..."
                  placeholderTextColor="#777"
                  style={[styles.filterSearchInput, { color: isDark ? '#ffffff' : '#111' }]}
                />
              </View>
            </View>

            <View style={{ gap: 8, marginBottom: 16 }}>
              <Text style={{ color: colors.text.primary }}>Região manual (sem usar GPS)</Text>
              <RNTextInput
                accessibilityLabel="Bairro ou cidade"
                value={region}
                onChangeText={setRegion}
                maxLength={60}
                placeholder="Ex.: Mooca ou São Paulo"
                placeholderTextColor="#888"
                style={{
                  color: colors.text.primary,
                  borderWidth: 1,
                  borderColor: colors.border.subtle,
                  padding: 12,
                  borderRadius: 12,
                }}
              />
            </View>
            {/* Modo de Descoberta */}
            <View style={{ gap: 8, marginBottom: 16 }}>
              <Text style={[styles.filterSectionLabel, { color: isDark ? '#e0e0e0' : '#222' }]}>
                Modo de Localização
              </Text>
              <View style={styles.filterPillsRow}>
                <Pressable
                  onPress={() => setSelectedMode('NEARBY')}
                  style={[
                    styles.filterPill,
                    selectedMode === 'NEARBY'
                      ? [styles.filterPillActive, { backgroundColor: colors.brand.primary }]
                      : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f3' },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedMode === 'NEARBY'
                        ? { color: '#ffffff' }
                        : { color: isDark ? '#aaa' : '#555' },
                    ]}
                  >
                    📍 Perto de mim
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedMode('ALL')}
                  style={[
                    styles.filterPill,
                    selectedMode === 'ALL'
                      ? [styles.filterPillActive, { backgroundColor: colors.brand.primary }]
                      : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f3' },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedMode === 'ALL'
                        ? { color: '#ffffff' }
                        : { color: isDark ? '#aaa' : '#555' },
                    ]}
                  >
                    🌐 Todas as barbearias
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Painel de status e recuperação quando NEARBY selecionado sem permissão/posição */}
            {selectedMode === 'NEARBY' && !isLocationGranted && (
              <View style={{ marginBottom: 16 }}>
                <LocationStatusPanel
                  status={
                    locationStore.getSession().state === 'unavailable' ||
                    locationStore.getSession().state === 'timeout'
                      ? 'unavailable'
                      : 'denied'
                  }
                  canAskAgain={true}
                  onRecoverPermission={async () => {
                    await locationStore.requestCurrentPosition();
                  }}
                  onRetryPosition={async () => {
                    await locationStore.requestCurrentPosition();
                  }}
                  onManualSearch={() => {
                    setSelectedMode('ALL');
                  }}
                />
              </View>
            )}

            {/* Raio de Proximidade (apenas se NEARBY) */}
            {selectedMode === 'NEARBY' && (
              <View style={{ gap: 8, marginBottom: 16 }}>
                <Text style={[styles.filterSectionLabel, { color: isDark ? '#e0e0e0' : '#222' }]}>
                  Raio Máximo
                </Text>
                <View style={styles.filterPillsRow}>
                  {([5, 10, 25, 50] as const).map((r) => (
                    <Pressable
                      key={`radius-${r}`}
                      onPress={() => setSelectedRadius(r)}
                      style={[
                        styles.filterPill,
                        selectedRadius === r
                          ? [styles.filterPillActive, { backgroundColor: colors.brand.primary }]
                          : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f3' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          selectedRadius === r
                            ? { color: '#ffffff' }
                            : { color: isDark ? '#aaa' : '#555' },
                        ]}
                      >
                        {`${r} km`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.sheetFooter, { flexDirection: 'row', gap: 10 }]}>
            <Button
              variant="outline"
              title="Limpar"
              onPress={handleReset}
              style={{ flex: 1, minHeight: 48 }}
            />
            <Button
              variant="primary"
              title="Aplicar Filtros"
              onPress={handleApply}
              style={{ flex: 2, minHeight: 48 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  sheetShopSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: {
    paddingVertical: 14,
  },
  priceDurationHighlight: {
    gap: 8,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  priceTag: {
    fontSize: 24,
    fontWeight: '800',
  },
  durationBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  metaText: {
    fontSize: 13,
  },
  sheetFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  catalogServiceCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogServiceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  catalogServiceDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  catalogServiceMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  aboutCard: {
    gap: 16,
    paddingVertical: 6,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  aboutValue: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    gap: 8,
  },
  filterSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
