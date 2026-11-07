import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  BackHandler,
  TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { BrandMark } from '@/shared/brand';
import { LoadingRegion } from '@/shared/ui/LoadingRegion';
import { useDiscovery } from '../model/use-discovery';
import { locationStore } from '../model/location-provider';
import {
  buildBarbershopCatalogHref,
  type PublicShop,
} from '../api/discovery.contract';
import type { BookingStart } from '../model/client-experience-context';
import { BarbershopCard } from './BarbershopCard';
import { NearbyResultsSkeleton } from './NearbyResultsSkeleton';

export interface BookingStartSheetProps {
  start: BookingStart | null;
  onClose: () => void;
}

export function BookingStartSheet({ start, onClose }: BookingStartSheetProps) {
  const { colors, radius, spacing, isDark } = useTheme();
  const router = useRouter();

  // Snapshot imutável capturado no momento da abertura
  const [frozenStart, setFrozenStart] = useState<BookingStart | null>(null);
  const [mode, setMode] = useState<'contextual' | 'general'>('general');
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (start && !frozenStart) {
      setFrozenStart(start);
      setMode(start.kind === 'contextual' ? 'contextual' : 'general');
    } else if (!start && frozenStart) {
      setFrozenStart(null);
      setMode('general');
      isNavigatingRef.current = false;
    }
  }, [start, frozenStart]);

  // Tecla Escape na Web e BackHandler no Android
  useEffect(() => {
    if (!start) return;

    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => sub.remove();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [start, onClose]);

  // Descoberta geral de barbearias (Modo ALL sem inventar distâncias quando sem GPS)
  const locationSession = locationStore.getSession();
  const hasValidCoords =
    locationSession.state === 'granted' && locationSession.coords !== null;

  const {
    searchQuery,
    setSearchQuery,
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useDiscovery({
    initialMode: hasValidCoords ? 'NEARBY' : 'ALL',
    initialQuery: '',
  });

  const handleNavigateToCatalog = useCallback(
    (targetHref: string) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      onClose();
      router.push(targetHref as any);
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    },
    [onClose, router],
  );

  if (!start && !frozenStart) {
    return null;
  }

  const activeSnapshot = frozenStart || start;
  const isContextual =
    mode === 'contextual' && activeSnapshot?.kind === 'contextual';
  const context =
    activeSnapshot?.kind === 'contextual' ? activeSnapshot.context : null;

  const handleContinueContextual = () => {
    if (!context) return;
    const baseHref = buildBarbershopCatalogHref(context.shopId);
    const targetHref = context.service?.id
      ? `${baseHref}?serviceId=${encodeURIComponent(context.service.id)}`
      : baseHref;
    handleNavigateToCatalog(targetHref);
  };

  const handleSwitchToGeneral = () => {
    setMode('general');
  };

  const handleSelectShop = (shop: PublicShop) => {
    handleNavigateToCatalog(buildBarbershopCatalogHref(shop.id));
  };

  return (
    <Modal
      visible={Boolean(start)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar agendamento ao tocar fora"
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#141416' : '#ffffff',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.sheetCategoryText, { color: colors.brand.primary }]}
              >
                {isContextual
                  ? context?.service
                    ? 'SERVIÇO SELECIONADO'
                    : 'AMBIENTE E ESTRUTURA'
                  : 'INICIAR AGENDAMENTO'}
              </Text>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: isDark ? '#ffffff' : colors.text.primary },
                ]}
                numberOfLines={2}
              >
                {isContextual
                  ? context?.shopName || 'Barbearia'
                  : 'Escolha uma barbearia'}
              </Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>
                {isContextual
                  ? context?.service
                    ? 'Confirmação do serviço antes de abrir o catálogo'
                    : 'Unidade selecionada no feed'
                  : 'Busque a unidade desejada para ver serviços e agendar.'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons
                name="close"
                size={22}
                color={isDark ? '#e0e0e0' : colors.text.primary}
              />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.sheetBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isContextual && context ? (
              <View style={styles.contextualContainer}>
                {context.service ? (
                  /* 1. Serviço válido no feed */
                  <View style={styles.serviceBox}>
                    <Text
                      style={[
                        styles.serviceTitle,
                        { color: isDark ? '#ffffff' : colors.text.primary },
                      ]}
                    >
                      {context.service.title}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text
                        style={[
                          styles.priceTag,
                          { color: colors.brand.primary },
                        ]}
                      >
                        {`R$ ${(context.service.priceInCents / 100)
                          .toFixed(2)
                          .replace('.', ',')}`}
                      </Text>
                      <Text
                        style={[
                          styles.durationBadge,
                          { color: isDark ? '#a0a0a0' : '#666' },
                        ]}
                      >
                        {`⏱ ${context.service.durationInMinutes} min`}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.helperText,
                        { color: isDark ? '#cccccc' : '#555' },
                      ]}
                    >
                      Ao continuar, você verá a disponibilidade desta unidade e
                      poderá escolher o profissional e o horário.
                    </Text>
                  </View>
                ) : (
                  /* 2. Foto ambiental ou mídia sem serviço */
                  <View style={styles.serviceBox}>
                    <Text
                      style={[
                        styles.helperText,
                        { color: isDark ? '#cccccc' : '#555' },
                      ]}
                    >
                      Esta publicação apresenta a estrutura e o ambiente de{' '}
                      {context.shopName}. Escolha os serviços desejados diretamente
                      no catálogo oficial da unidade.
                    </Text>
                  </View>
                )}

                <View style={styles.contextActionsRow}>
                  <Button
                    variant="primary"
                    title={context.service ? 'Continuar' : 'Escolher serviço'}
                    onPress={handleContinueContextual}
                    accessibilityLabel={
                      context.service
                        ? 'Continuar para o catálogo'
                        : 'Escolher serviço no catálogo da barbearia'
                    }
                    style={{ width: '100%', minHeight: 48 }}
                  />
                  <Button
                    variant="outline"
                    title={
                      context.service
                        ? 'Trocar barbearia ou serviço'
                        : 'Trocar barbearia'
                    }
                    onPress={handleSwitchToGeneral}
                    accessibilityLabel="Trocar barbearia ou serviço"
                    style={{ width: '100%', minHeight: 44, marginTop: 10 }}
                  />
                </View>
              </View>
            ) : (
              /* 3. Seleção Geral de Barbearia */
              <View style={styles.generalContainer}>
                {/* Campo de Busca Editável */}
                <View
                  style={[
                    styles.searchInputWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : '#f0f0f3',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : '#d0d0d5',
                    },
                  ]}
                >
                  <Ionicons
                    name="search"
                    size={18}
                    color={isDark ? '#888' : '#666'}
                  />
                  <RNTextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Buscar barbearia por nome ou bairro..."
                    placeholderTextColor={isDark ? '#777' : '#999'}
                    accessibilityLabel="Buscar barbearia por nome ou bairro"
                    style={[
                      styles.searchInput,
                      { color: isDark ? '#ffffff' : '#111111' },
                    ]}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      accessibilityRole="button"
                      accessibilityLabel="Limpar busca"
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={18} color="#888" />
                    </Pressable>
                  )}
                </View>

                {/* Lista / Feedback de Resultados */}
                <LoadingRegion
                  operationKey="booking-start-search"
                  active={isLoading}
                  phase={isLoading && items.length === 0 ? 'initial' : 'refresh'}
                  label="Carregando barbearias"
                  hasContent={items.length > 0}
                  placeholder={<NearbyResultsSkeleton count={3} />}
                >
                  {error && items.length === 0 ? (
                    <View style={styles.emptyCenter}>
                      <BrandMark
                        size={40}
                        variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                        decorative
                      />
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: isDark ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        Não foi possível carregar as barbearias
                      </Text>
                      <Button
                        variant="outline"
                        title="Tentar novamente"
                        onPress={() => refetch()}
                        style={{ marginTop: 12 }}
                      />
                    </View>
                  ) : items.length === 0 && !isLoading ? (
                    <View style={styles.emptyCenter}>
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: isDark ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        Nenhuma barbearia encontrada
                      </Text>
                      <Text
                        style={[
                          styles.emptySubtitle,
                          { color: isDark ? '#a0a0a0' : '#666' },
                        ]}
                      >
                        {searchQuery.trim()
                          ? `Não encontramos unidades para "${searchQuery.trim()}". Tente outro nome ou bairro.`
                          : 'Nenhuma unidade encontrada no momento.'}
                      </Text>
                      {searchQuery.trim().length > 0 && (
                        <Button
                          variant="outline"
                          title="Limpar busca"
                          onPress={() => setSearchQuery('')}
                          style={{ marginTop: 12 }}
                        />
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 12, paddingBottom: 16 }}>
                      {items.map((shop) => (
                        <View key={shop.id}>
                          <BarbershopCard
                            shop={shop}
                            showPhotoCarousel={false}
                            onPress={() => handleSelectShop(shop)}
                          />
                        </View>
                      ))}

                      {hasNextPage && (
                        <View style={{ marginTop: 8, alignItems: 'center' }}>
                          {isFetchingNextPage ? (
                            <Spinner size="small" />
                          ) : (
                            <Button
                              variant="outline"
                              title="Carregar mais barbearias"
                              onPress={() => fetchNextPage()}
                              style={{ width: '100%' }}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </LoadingRegion>
              </View>
            )}
          </ScrollView>
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
    maxHeight: '85%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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
  sheetSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sheetBody: {
    paddingVertical: 14,
  },
  contextualContainer: {
    gap: 16,
  },
  serviceBox: {
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  priceTag: {
    fontSize: 22,
    fontWeight: '800',
  },
  durationBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  contextActionsRow: {
    marginTop: 8,
  },
  generalContainer: {
    gap: 14,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  emptyCenter: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
  },
});
