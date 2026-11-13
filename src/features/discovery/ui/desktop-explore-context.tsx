import React from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { ExploreFeedItem, ExploreFeedMediaItem } from '../api/explore-feed.contract';

export interface DesktopExploreContextProps {
  item: ExploreFeedItem;
  media: ExploreFeedMediaItem | null;
  onBook: (item: ExploreFeedItem, media: ExploreFeedMediaItem | null) => void;
  onCatalog: (item: ExploreFeedItem) => void;
  onAbout: (item: ExploreFeedItem) => void;
  onReviews: (item: ExploreFeedItem) => void;
  disabled?: boolean;
}

/**
 * Painel Contextual e de Agendamento do Explorar Desktop.
 * Exibe dados honestos da barbearia, avaliação real, distância com base verificada,
 * contexto do serviço da foto/vídeo atual e ação primária de agendamento.
 * Não duplica queries, não inventa preços para ambientes e não realiza POSTs diretos de agendamento.
 */
export function DesktopExploreContext({
  item,
  media,
  onBook,
  onCatalog,
  onAbout,
  onReviews,
  disabled = false,
}: DesktopExploreContextProps) {
  const { colors } = useTheme();

  const formattedDistance =
    item.distanceMeters !== null && Number.isFinite(item.distanceMeters)
      ? item.distanceBasis === 'region'
        ? `${(item.distanceMeters / 1000).toFixed(1).replace('.', ',')} km da região`
        : `${(item.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
      : null;

  const hasShopRating =
    (item.barbershop.reviewCount ?? 0) > 0 &&
    item.barbershop.rating !== null &&
    item.barbershop.rating !== undefined;

  const ratingText = hasShopRating
    ? `${item.barbershop.rating!.toFixed(1).replace('.', ',')} (${item.barbershop.reviewCount})`
    : 'Sem avaliações';

  const hasService = Boolean(media?.kind === 'service' && media.service);

  return (
    <LiquidGlassView
      variant="card"
      elevated
      borderRadius={16}
      style={styles.cardContainer}
      contentStyle={styles.cardContent}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* 1. Cabeçalho da Unidade: Logo + Nome + Localização */}
        <View style={styles.shopSection}>
          <View style={styles.shopHeaderRow}>
            {item.barbershop.logoUrl ? (
              <Image
                source={{ uri: item.barbershop.logoUrl }}
                style={styles.shopLogo}
                resizeMode="contain"
                accessibilityLabel={`Logo da barbearia ${item.barbershop.name}`}
              />
            ) : (
              <View style={styles.shopLogoFallback}>
                <BrandMark size={24} variant="symbol-ivory" decorative />
              </View>
            )}

            <View style={styles.shopTextColumn}>
              <Text style={styles.shopName} numberOfLines={2}>
                {item.barbershop.name}
              </Text>
              <Text style={styles.shopLocation} numberOfLines={2}>
                {item.barbershop.location}
              </Text>
            </View>
          </View>

          {/* Reputação e Distância */}
          <View style={styles.metricsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Avaliação: ${ratingText}. Toque para abrir avaliações.`}
              onPress={() => onReviews(item)}
              style={styles.ratingBadge}
            >
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.ratingText}>{ratingText}</Text>
            </Pressable>

            {formattedDistance && (
              <View style={styles.distanceBadge}>
                <Ionicons name="location-sharp" size={13} color="#94a3b8" />
                <Text style={styles.distanceText}>{formattedDistance}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 2. Contexto da Mídia Ativa */}
        <View style={styles.contextSection}>
          {hasService && media?.service ? (
            <View style={styles.serviceBox}>
              <Text style={styles.contextEyebrow}>Serviço em exibição</Text>
              <Text style={styles.serviceTitle}>{media.service.title}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.servicePrice}>
                  {`R$ ${(media.service.priceInCents / 100).toFixed(2).replace('.', ',')}`}
                </Text>
                <Text style={styles.serviceBullet}>•</Text>
                <Text style={styles.serviceDuration}>
                  {`${media.service.durationInMinutes} min`}
                </Text>
              </View>
              <Text style={styles.serviceRatingText}>
                {(media.service.reviewCount ?? 0) > 0 &&
                media.service.rating !== null &&
                media.service.rating !== undefined
                  ? `★ ${media.service.rating.toFixed(1).replace('.', ',')} (${media.service.reviewCount}) no serviço`
                  : 'Serviço sem avaliações'}
              </Text>
              <Text style={styles.illustrativeNotice}>Imagens e dados ilustrativos</Text>
            </View>
          ) : media ? (
            <View style={styles.environmentBox}>
              <Text style={styles.contextEyebrow}>Espaço da unidade</Text>
              <Text style={styles.serviceTitle}>Ambiente da Barbearia</Text>
              <Text style={styles.environmentSubtext}>
                Estrutura e instalações do espaço
              </Text>
              <Text style={styles.illustrativeNotice}>
                {media.rightsPending
                  ? 'Imagens ilustrativas • procedência em revisão'
                  : 'Imagens e dados ilustrativos'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyMediaBox}>
              <Text style={styles.emptyMediaText}>
                Explore o catálogo completo de serviços da barbearia.
              </Text>
            </View>
          )}
        </View>

        {/* 3. Ação Primária de Agendamento */}
        <View style={styles.primaryActionSection}>
          {hasService ? (
            <Button
              variant="primary"
              title="Agendar este serviço"
              disabled={disabled}
              onPress={() => onBook(item, media)}
              accessibilityLabel="Agendar este serviço"
            />
          ) : (
            <Button
              variant="primary"
              title="Ver serviços e agendar"
              disabled={disabled}
              onPress={() => onCatalog(item)}
              accessibilityLabel="Ver serviços e agendar"
            />
          )}
        </View>

        <View style={styles.divider} />

        {/* 4. Ações Secundárias */}
        <View style={styles.secondaryActionsSection}>
          {hasService && (
            <Button
              variant="outline"
              title="Ver todos os serviços"
              disabled={disabled}
              onPress={() => onCatalog(item)}
              accessibilityLabel="Ver todos os serviços da barbearia"
              style={styles.secondaryButton}
            />
          )}

          <View style={styles.secondaryButtonRow}>
            <Button
              variant="secondary"
              title="Sobre a barbearia"
              disabled={disabled}
              onPress={() => onAbout(item)}
              accessibilityLabel="Sobre a barbearia"
              style={styles.halfButton}
            />
            <Button
              variant="secondary"
              title="Ver avaliações"
              disabled={disabled}
              onPress={() => onReviews(item)}
              accessibilityLabel="Ver avaliações da barbearia"
              style={styles.halfButton}
            />
          </View>
        </View>
      </ScrollView>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'rgba(18, 18, 22, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  shopSection: {
    gap: 12,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1e',
  },
  shopLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopTextColumn: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 22,
  },
  shopLocation: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  distanceText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  contextSection: {
    gap: 8,
  },
  contextEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  serviceBox: {
    gap: 4,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  serviceBullet: {
    fontSize: 14,
    color: '#64748b',
  },
  serviceDuration: {
    fontSize: 14,
    color: '#94a3b8',
  },
  serviceRatingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#fbbf24',
    marginTop: 4,
  },
  environmentBox: {
    gap: 4,
  },
  environmentSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyMediaBox: {
    paddingVertical: 12,
  },
  emptyMediaText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  illustrativeNotice: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 6,
  },
  primaryActionSection: {
    marginTop: 16,
  },
  secondaryActionsSection: {
    gap: 8,
  },
  secondaryButton: {
    marginBottom: 4,
  },
  secondaryButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfButton: {
    flex: 1,
  },
});
