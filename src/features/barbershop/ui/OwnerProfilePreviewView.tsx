import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import { Text, Badge, Button, useToast, Spinner } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { sharePublicCatalog } from '@/shared/navigation/catalog-share.helper';
import { ExploreFeedSlide } from '@/features/discovery/ui/ExploreFeedSlide';
import {
  ExploreServiceSheet,
  ExploreCatalogSheet,
  ExploreAboutSheet,
  ExploreReviewsSheet,
} from '@/features/discovery/ui/ExploreSheets';
import { BarbershopCard } from '@/features/discovery/ui/BarbershopCard';
import type {
  ExploreFeedItem,
  ExploreFeedMediaItem,
} from '@/features/discovery/api/explore-feed.contract';
import { PublicCatalogView } from '@/features/services/ui/PublicCatalogView';
import { useOwnerProfilePreview } from '../model/use-owner-profile-preview';

type PreviewTab = 'FEED' | 'CATALOG' | 'CARD';

export function OwnerProfilePreviewView() {
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useAppSafeArea();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<PreviewTab>('FEED');
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  // Estados dos Sheets do Feed Explorar
  const [activeMediaItem, setActiveMediaItem] = useState<{
    item: ExploreFeedItem;
    activeMedia: ExploreFeedMediaItem;
  } | null>(null);
  const [activeCatalogItem, setActiveCatalogItem] = useState<ExploreFeedItem | null>(null);
  const [activeAboutItem, setActiveAboutItem] = useState<ExploreFeedItem | null>(null);
  const [activeReviewsItem, setActiveReviewsItem] = useState<ExploreFeedItem | null>(null);

  const {
    shopId,
    shopName,
    checklist,
    completedCount,
    totalCount,
    readinessPercent,
    previewExploreItem,
    previewPublicShop,
    isLoading,
  } = useOwnerProfilePreview();

  const handleShare = async () => {
    await sharePublicCatalog({
      barbershopId: shopId,
      barbershopName: shopName,
      onSuccess: (msg) => showToast(msg, 'success'),
      onError: (err) => showToast(err.message, 'error'),
    });
  };

  // Cálculo proporcional para o chassis do celular no Feed Explorar
  const slideWidth = isCompact
    ? Math.min(380, windowWidth - 32)
    : Math.min(420, windowWidth - 64);
  const slideHeight = isCompact
    ? Math.min(600, Math.max(480, windowHeight - 270))
    : 660;

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
        <Text variant="body" color={colors.text.secondary} style={{ marginTop: 12 }}>
          Preparando visualização prévia da barbearia…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background.primary }]}>
      {/* 1. TOPO DA PRÉVIA: Cabeçalho Otimizado com Layout Adaptativo */}
      <View
        style={[
          styles.headerSection,
          {
            paddingHorizontal: isCompact ? spacing[4] : spacing[6],
            paddingTop: Math.max(insets.top, spacing[3]),
            paddingBottom: spacing[3],
            borderBottomColor: colors.border.subtle,
            backgroundColor: isDark ? 'rgba(15, 15, 15, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleGroup}>
            <Text
              variant={isCompact ? 'h3' : 'h2'}
              weight="bold"
              color={colors.text.primary}
              numberOfLines={1}
            >
              Prévia do Perfil Público
            </Text>
            <Badge label="Owner" tone="brand" size="sm" />
          </View>

          {/* Botão de Compartilhar Link (Única ação externa da tela) */}
          <Button
            title="Compartilhar Link"
            variant="outline"
            leftIcon={<Ionicons name="share-social-outline" size={15} color={colors.text.primary} />}
            onPress={handleShare}
            style={[
              styles.shareButton,
              {
                borderColor: colors.border.subtle,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              },
            ]}
            textStyle={{ fontSize: 13, fontWeight: '600' }}
          />
        </View>

        <Text
          variant="caption"
          color={colors.text.secondary}
          style={styles.headerSubtitle}
        >
          Veja em tempo real como sua barbearia aparece para clientes nas 3 superfícies públicas.
        </Text>
      </View>

      {/* 2. SELETOR FIXO DE ABAS (STICKY): Sempre visível para alternância rápida */}
      <View
        style={[
          styles.stickyTabsBar,
          {
            backgroundColor: isDark ? 'rgba(12, 12, 12, 0.96)' : 'rgba(245, 245, 247, 0.96)',
            borderBottomColor: colors.border.subtle,
            paddingHorizontal: isCompact ? spacing[3] : spacing[6],
          },
        ]}
      >
        <View
          style={[
            styles.tabSelectorWrap,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e5e5ea',
              borderRadius: radius.lg,
            },
          ]}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Aba Feed Explorar"
            accessibilityState={{ selected: activeTab === 'FEED' }}
            onPress={() => setActiveTab('FEED')}
            style={[
              styles.tabButton,
              activeTab === 'FEED' && [
                styles.tabButtonActive,
                { backgroundColor: colors.brand.primary, borderRadius: radius.md },
              ],
            ]}
          >
            <Ionicons
              name={activeTab === 'FEED' ? 'compass' : 'compass-outline'}
              size={16}
              color={activeTab === 'FEED' ? '#FFFFFF' : colors.text.secondary}
            />
            <Text
              variant="bodySm"
              weight={activeTab === 'FEED' ? 'bold' : 'medium'}
              style={{
                color: activeTab === 'FEED' ? '#FFFFFF' : colors.text.secondary,
                fontSize: isCompact ? 12 : 13,
              }}
              numberOfLines={1}
            >
              1. Feed Explorar
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Aba Catálogo Oficial"
            accessibilityState={{ selected: activeTab === 'CATALOG' }}
            onPress={() => setActiveTab('CATALOG')}
            style={[
              styles.tabButton,
              activeTab === 'CATALOG' && [
                styles.tabButtonActive,
                { backgroundColor: colors.brand.primary, borderRadius: radius.md },
              ],
            ]}
          >
            <Ionicons
              name={activeTab === 'CATALOG' ? 'book' : 'book-outline'}
              size={16}
              color={activeTab === 'CATALOG' ? '#FFFFFF' : colors.text.secondary}
            />
            <Text
              variant="bodySm"
              weight={activeTab === 'CATALOG' ? 'bold' : 'medium'}
              style={{
                color: activeTab === 'CATALOG' ? '#FFFFFF' : colors.text.secondary,
                fontSize: isCompact ? 12 : 13,
              }}
              numberOfLines={1}
            >
              2. Catálogo Oficial
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Aba Card de Busca"
            accessibilityState={{ selected: activeTab === 'CARD' }}
            onPress={() => setActiveTab('CARD')}
            style={[
              styles.tabButton,
              activeTab === 'CARD' && [
                styles.tabButtonActive,
                { backgroundColor: colors.brand.primary, borderRadius: radius.md },
              ],
            ]}
          >
            <Ionicons
              name={activeTab === 'CARD' ? 'card' : 'card-outline'}
              size={16}
              color={activeTab === 'CARD' ? '#FFFFFF' : colors.text.secondary}
            />
            <Text
              variant="bodySm"
              weight={activeTab === 'CARD' ? 'bold' : 'medium'}
              style={{
                color: activeTab === 'CARD' ? '#FFFFFF' : colors.text.secondary,
                fontSize: isCompact ? 12 : 13,
              }}
              numberOfLines={1}
            >
              3. Card de Busca
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 3. CONTEÚDO ROLÁVEL COM PADDING SEGURO CONTRA A BARRA DE NAVEGAÇÃO INFERIOR */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingHorizontal: isCompact ? spacing[3] : spacing[6],
            paddingTop: spacing[3],
            paddingBottom: Math.max(insets.bottom, 24) + 100, // Previne colisão com bottom navigation bar
          },
        ]}
      >
        {/* CARD COLAPSÁVEL DE PRONTIDÃO COMERCIAL */}
        <LiquidGlassView
          variant="card"
          borderRadius={radius.lg}
          style={styles.checklistCard}
          contentStyle={[styles.checklistContent, { padding: spacing[3] }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alternar visualização do checklist de prontidão"
            onPress={() => setIsChecklistExpanded((prev) => !prev)}
            style={styles.checklistHeaderRow}
          >
            <View style={styles.checklistHeaderLeft}>
              <View style={styles.checkIconWrap}>
                <Ionicons
                  name={readinessPercent === 100 ? 'checkmark-circle' : 'sparkles'}
                  size={18}
                  color={readinessPercent === 100 ? '#10b981' : colors.brand.primary}
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                    Prontidão Comercial:
                  </Text>
                  <Badge
                    label={`${readinessPercent}% Concluído`}
                    tone={readinessPercent === 100 ? 'success' : 'brand'}
                    size="sm"
                  />
                </View>
                <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
                  {completedCount} de {totalCount} critérios preenchidos
                </Text>
              </View>
            </View>

            <View style={styles.checklistHeaderRight}>
              {/* Barra de progresso compacta */}
              <View
                style={[
                  styles.miniProgressBarTrack,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${readinessPercent}%`,
                      backgroundColor: readinessPercent === 100 ? '#10b981' : colors.brand.primary,
                      borderRadius: radius.full,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.expandIndicator,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Ionicons
                  name={isChecklistExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.text.secondary}
                />
              </View>
            </View>
          </Pressable>

          {/* Lista detalhada do checklist (expandível sob demanda) */}
          {isChecklistExpanded && (
            <View style={styles.checklistItemsList}>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border.subtle, marginVertical: spacing[1] },
                ]}
              />

              {checklist.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.checklistItemRow,
                    {
                      borderColor: colors.border.subtle,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.isComplete ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={20}
                    color={item.isComplete ? '#10b981' : '#f59e0b'}
                    style={{ marginTop: 2 }}
                  />

                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                      {item.label}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      {item.description}
                    </Text>
                  </View>

                  <Button
                    title={item.actionLabel}
                    variant={item.isComplete ? 'ghost' : 'outline'}
                    onPress={() => router.push(item.actionRoute as any)}
                    style={{ minHeight: 32, paddingHorizontal: spacing[3] }}
                    textStyle={{ fontSize: 12 }}
                  />
                </View>
              ))}
            </View>
          )}
        </LiquidGlassView>

        {/* 4. CANVAS DA SUPERFÍCIE SELECIONADA */}
        <View style={styles.previewCanvas}>
          {/* SUPERFÍCIE 1: FEED EXPLORAR */}
          {activeTab === 'FEED' && (
            <View style={styles.feedPreviewContainer}>
              <View
                style={[
                  styles.mobileChassis,
                  {
                    width: slideWidth,
                    height: slideHeight,
                    borderRadius: isCompact ? radius.lg : 32,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)',
                    backgroundColor: '#000000',
                  },
                ]}
              >
                {/* Entalhe visual simulador de dispositivo móvel */}
                <View style={styles.deviceNotchRow}>
                  <View
                    style={[
                      styles.deviceNotchPill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.25)'
                          : 'rgba(255, 255, 255, 0.35)',
                      },
                    ]}
                  />
                </View>

                <ExploreFeedSlide
                  item={previewExploreItem}
                  width={slideWidth}
                  height={slideHeight}
                  topInset={20}
                  bottomInset={24}
                  isActive={true}
                  isNear={true}
                  locationLabel="Visualização Prévia (Owner)"
                  onOpenService={(item, activeMedia) =>
                    setActiveMediaItem({ item, activeMedia })
                  }
                  onOpenCatalog={(item) => setActiveCatalogItem(item)}
                  onOpenAbout={(item) => setActiveAboutItem(item)}
                  onOpenReviews={(item) => setActiveReviewsItem(item)}
                />
              </View>

              <View style={styles.previewHintBox}>
                <Ionicons name="information-circle-outline" size={15} color={colors.text.muted} />
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={styles.previewHintText}
                >
                  Esta é exatamente a exibição imersiva 9:16 que o cliente visualiza no Feed.
                </Text>
              </View>
            </View>
          )}

          {/* SUPERFÍCIE 2: CATÁLOGO OFICIAL */}
          {activeTab === 'CATALOG' && (
            <View style={styles.catalogPreviewContainer}>
              <View
                style={[
                  styles.catalogBrowserFrame,
                  {
                    borderColor: colors.border.subtle,
                    borderRadius: isCompact ? radius.md : radius.xl,
                    backgroundColor: colors.background.primary,
                  },
                ]}
              >
                {/* Barra de simulação de navegador do catálogo */}
                <View
                  style={[
                    styles.browserToolbar,
                    {
                      borderBottomColor: colors.border.subtle,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    },
                  ]}
                >
                  <View style={styles.browserDotsRow}>
                    <View style={[styles.browserDot, { backgroundColor: '#ef4444' }]} />
                    <View style={[styles.browserDot, { backgroundColor: '#f59e0b' }]} />
                    <View style={[styles.browserDot, { backgroundColor: '#10b981' }]} />
                  </View>

                  <View
                    style={[
                      styles.browserUrlPill,
                      {
                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(255, 255, 255, 0.80)',
                        borderColor: colors.border.subtle,
                      },
                    ]}
                  >
                    <Ionicons name="lock-closed" size={12} color="#10b981" />
                    <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
                      smartbarber.app/catalogo/{shopId}
                    </Text>
                  </View>
                </View>

                <PublicCatalogView barbershopId={shopId} previewMode={true} />
              </View>

              <View style={styles.previewHintBox}>
                <Ionicons name="information-circle-outline" size={15} color={colors.text.muted} />
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={styles.previewHintText}
                >
                  Simulação do Catálogo Oficial da barbearia com serviços, fotos e avaliações.
                </Text>
              </View>
            </View>
          )}

          {/* SUPERFÍCIE 3: CARD DE BUSCA */}
          {activeTab === 'CARD' && (
            <View style={styles.cardPreviewContainer}>
              <View style={styles.cardWrapper}>
                <View
                  style={[
                    styles.searchHeaderMock,
                    {
                      borderColor: colors.border.subtle,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons name="search" size={16} color={colors.text.muted} />
                  <Text variant="bodySm" color={colors.text.secondary} numberOfLines={1}>
                    Barbearias perto de você
                  </Text>
                </View>

                <BarbershopCard shop={previewPublicShop} showPhotoCarousel={true} />
              </View>

              <View style={styles.previewHintBox}>
                <Ionicons name="information-circle-outline" size={15} color={colors.text.muted} />
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={styles.previewHintText}
                >
                  Aparência no resultado de busca e listagens de proximidade para clientes.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sheets Interativos da Simulação do Feed */}
      <ExploreServiceSheet
        visible={Boolean(activeMediaItem)}
        item={activeMediaItem?.item || null}
        activeMedia={activeMediaItem?.activeMedia || null}
        onClose={() => setActiveMediaItem(null)}
      />

      <ExploreCatalogSheet
        visible={Boolean(activeCatalogItem)}
        item={activeCatalogItem}
        onClose={() => setActiveCatalogItem(null)}
      />

      <ExploreAboutSheet
        visible={Boolean(activeAboutItem)}
        item={activeAboutItem}
        onClose={() => setActiveAboutItem(null)}
      />

      <ExploreReviewsSheet
        visible={Boolean(activeReviewsItem)}
        item={activeReviewsItem}
        onClose={() => setActiveReviewsItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerSection: {
    borderBottomWidth: 1,
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  headerSubtitle: {
    lineHeight: 18,
    maxWidth: 680,
  },
  shareButton: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  stickyTabsBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabSelectorWrap: {
    flexDirection: 'row',
    padding: 3,
    gap: 4,
    maxWidth: 640,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  tabButtonActive: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  scrollBody: {
    flexGrow: 1,
    alignItems: 'center',
  },
  checklistCard: {
    marginBottom: 16,
    width: '100%',
    maxWidth: 880,
  },
  checklistContent: {
    gap: 8,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  checklistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  checkIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniProgressBarTrack: {
    width: 70,
    height: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  expandIndicator: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  checklistItemsList: {
    gap: 8,
    paddingTop: 4,
  },
  checklistItemRow: {
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewCanvas: {
    width: '100%',
    alignItems: 'center',
  },
  feedPreviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mobileChassis: {
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  deviceNotchRow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  deviceNotchPill: {
    width: 64,
    height: 4,
    borderRadius: 2,
  },
  previewHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  previewHintText: {
    textAlign: 'center',
    lineHeight: 16,
  },
  catalogPreviewContainer: {
    width: '100%',
    maxWidth: 880,
    minHeight: 650,
  },
  catalogBrowserFrame: {
    borderWidth: 1,
    minHeight: 650,
    overflow: 'hidden',
  },
  browserToolbar: {
    height: 38,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  browserDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  browserDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  browserUrlPill: {
    flex: 1,
    maxWidth: 380,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  cardPreviewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 480,
    gap: 10,
  },
  searchHeaderMock: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
