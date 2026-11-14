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
import { Text, Badge, Button, useToast, Spinner } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { sharePublicCatalog, openPublicCatalog } from '@/shared/navigation/catalog-share.helper';
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
    publicCatalogUrl,
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

  const handleOpenExternal = async () => {
    await openPublicCatalog(shopId);
  };

  const slideWidth = isCompact ? windowWidth : Math.min(430, windowWidth - 64);
  const slideHeight = isCompact ? Math.min(680, windowHeight - 200) : 660;

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
      {/* 1. TOPO DA PRÉVIA: Título & Ações Principais */}
      <View
        style={[
          styles.headerSection,
          {
            paddingHorizontal: isCompact ? spacing[4] : spacing[6],
            paddingVertical: spacing[4],
            borderBottomColor: colors.border.subtle,
            backgroundColor: isDark ? 'rgba(15, 15, 15, 0.85)' : 'rgba(255, 255, 255, 0.90)',
          },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="h2" weight="bold" color={colors.text.primary} numberOfLines={1}>
              Prévia do Perfil Público
            </Text>
            <Badge label="Owner" tone="brand" size="sm" />
          </View>
          <Text variant="caption" color={colors.text.muted}>
            Veja em tempo real como sua barbearia aparece para clientes nas 3 superfícies públicas.
          </Text>
        </View>

        <View style={styles.headerActionsRow}>
          <Button
            title="Compartilhar Link"
            variant="outline"
            leftIcon={<Ionicons name="share-social-outline" size={16} color={colors.text.primary} />}
            onPress={handleShare}
            style={{ minHeight: 40, paddingHorizontal: spacing[3] }}
            textStyle={{ fontSize: 13 }}
          />
          <Button
            title="Abrir Catálogo Web"
            variant="primary"
            leftIcon={<Ionicons name="open-outline" size={16} color="#FFFFFF" />}
            onPress={handleOpenExternal}
            style={{ minHeight: 40, paddingHorizontal: spacing[3] }}
            textStyle={{ fontSize: 13 }}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingHorizontal: isCompact ? spacing[4] : spacing[6],
            paddingTop: spacing[4],
            paddingBottom: spacing[8],
          },
        ]}
      >
        {/* 2. CARD DO CHECKLIST DE PRONTIDÃO COMERCIAL */}
        <LiquidGlassView
          variant="card"
          borderRadius={radius.lg}
          style={styles.checklistCard}
          contentStyle={[styles.checklistContent, { padding: spacing[4] }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alternar visualização do checklist de prontidão"
            onPress={() => setIsChecklistExpanded((prev) => !prev)}
            style={styles.checklistHeaderRow}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={readinessPercent === 100 ? 'checkmark-circle' : 'sparkles'}
                  size={20}
                  color={readinessPercent === 100 ? '#10b981' : colors.brand.primary}
                />
                <Text variant="subhead" weight="bold" color={colors.text.primary}>
                  Prontidão Comercial da Unidade
                </Text>
                <Badge
                  label={`${readinessPercent}% Concluído`}
                  tone={readinessPercent === 100 ? 'success' : 'brand'}
                  size="sm"
                />
              </View>
              <Text variant="caption" color={colors.text.secondary}>
                {completedCount} de {totalCount} critérios preenchidos para máxima conversão de clientes.
              </Text>
            </View>

            <Ionicons
              name={isChecklistExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.secondary}
            />
          </Pressable>

          {/* Barra de Progresso Visual */}
          <View
            style={[
              styles.progressBarTrack,
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

          {/* Lista detalhada do checklist (expandível) */}
          {isChecklistExpanded && (
            <View style={styles.checklistItemsList}>
              {checklist.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.checklistItemRow,
                    {
                      borderColor: colors.border.subtle,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.isComplete ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={22}
                    color={item.isComplete ? '#10b981' : '#f59e0b'}
                    style={{ marginTop: 2 }}
                  />

                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text
                      variant="bodySm"
                      weight="bold"
                      color={item.isComplete ? colors.text.primary : colors.text.primary}
                    >
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
                    style={{ minHeight: 34, paddingHorizontal: spacing[3] }}
                    textStyle={{ fontSize: 12 }}
                  />
                </View>
              ))}
            </View>
          )}
        </LiquidGlassView>

        {/* 3. SELETOR DE ABAS DAS 3 SUPERFÍCIES PÚBLICAS */}
        <View style={styles.tabSelectorContainer}>
          <View
            style={[
              styles.tabSelectorWrap,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e5ea',
                borderRadius: radius.lg,
              },
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Aba Feed Explorar"
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
                name="compass-outline"
                size={16}
                color={activeTab === 'FEED' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text
                variant="bodySm"
                weight={activeTab === 'FEED' ? 'bold' : 'medium'}
                style={{ color: activeTab === 'FEED' ? '#FFFFFF' : colors.text.secondary }}
              >
                1. Feed Explorar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Aba Catálogo Oficial"
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
                name="book-outline"
                size={16}
                color={activeTab === 'CATALOG' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text
                variant="bodySm"
                weight={activeTab === 'CATALOG' ? 'bold' : 'medium'}
                style={{ color: activeTab === 'CATALOG' ? '#FFFFFF' : colors.text.secondary }}
              >
                2. Catálogo Oficial
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Aba Card de Busca"
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
                name="card-outline"
                size={16}
                color={activeTab === 'CARD' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text
                variant="bodySm"
                weight={activeTab === 'CARD' ? 'bold' : 'medium'}
                style={{ color: activeTab === 'CARD' ? '#FFFFFF' : colors.text.secondary }}
              >
                3. Card de Busca
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4. CONTEÚDO DA SUPERFÍCIE SELECIONADA */}
        <View style={styles.previewCanvas}>
          {activeTab === 'FEED' && (
            <View style={styles.feedPreviewContainer}>
              <View
                style={[
                  styles.feedSlideBox,
                  {
                    width: slideWidth,
                    height: slideHeight,
                    borderRadius: isCompact ? 0 : radius.xl,
                    overflow: 'hidden',
                    borderColor: colors.border.subtle,
                    borderWidth: isCompact ? 0 : 1,
                  },
                ]}
              >
                <ExploreFeedSlide
                  item={previewExploreItem}
                  width={slideWidth}
                  height={slideHeight}
                  topInset={16}
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

              <Text
                variant="caption"
                color={colors.text.muted}
                style={{ textAlign: 'center', marginTop: 10 }}
              >
                ✦ Esta é exatamente a exibição imersiva que o cliente visualiza no Feed Explorar.
              </Text>
            </View>
          )}

          {activeTab === 'CATALOG' && (
            <View style={styles.catalogPreviewContainer}>
              <View
                style={[
                  styles.catalogFrame,
                  {
                    borderColor: colors.border.subtle,
                    borderRadius: isCompact ? 0 : radius.xl,
                    overflow: 'hidden',
                    backgroundColor: colors.background.primary,
                  },
                ]}
              >
                <PublicCatalogView barbershopId={shopId} previewMode={true} />
              </View>
            </View>
          )}

          {activeTab === 'CARD' && (
            <View style={styles.cardPreviewContainer}>
              <View style={styles.cardWrapper}>
                <Text
                  variant="caption"
                  color={colors.text.muted}
                  style={{ marginBottom: 12, textAlign: 'center' }}
                >
                  Aparência no resultado de busca e listagens de proximidade:
                </Text>
                <BarbershopCard shop={previewPublicShop} showPhotoCarousel={true} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollBody: {
    flexGrow: 1,
  },
  checklistCard: {
    marginBottom: 20,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  checklistContent: {
    gap: 12,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  checklistItemsList: {
    marginTop: 6,
    gap: 8,
  },
  checklistItemRow: {
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabSelectorContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  tabSelectorWrap: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    maxWidth: 620,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    elevation: 2,
  },
  previewCanvas: {
    width: '100%',
    alignItems: 'center',
  },
  feedPreviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  feedSlideBox: {
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  catalogPreviewContainer: {
    width: '100%',
    maxWidth: 880,
    minHeight: 700,
  },
  catalogFrame: {
    borderWidth: 1,
    minHeight: 700,
  },
  cardPreviewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 480,
  },
});
