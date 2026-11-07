import React from 'react';
import { View, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  type DesktopExploreLayoutResult,
  DESKTOP_LAYOUT_CONSTANTS,
} from '../lib/desktop-explore-layout';

export interface DesktopExploreLayoutProps {
  metrics: DesktopExploreLayoutResult;
  media: React.ReactNode;
  context: React.ReactNode;
  shopControls: React.ReactNode;
  mediaControls: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Composição por slots do Explorar Desktop.
 * Organiza palco de mídia, trilho/linha de barbearias, controle de fotos/vídeos e painel contextual.
 * Não contém estado de query, reserva ou mutações.
 */
export function DesktopExploreLayout({
  metrics,
  media,
  context,
  shopControls,
  mediaControls,
  style,
}: DesktopExploreLayoutProps) {
  if (metrics.mode === 'unmeasured') {
    return <View style={[styles.baseContainer, style]} testID="desktop-explore-unmeasured" />;
  }

  if (metrics.mode === 'side-by-side') {
    return (
      <View
        style={[styles.baseContainer, styles.sideBySideRow, style]}
        testID="desktop-explore-side-by-side"
      >
        {/* Trilho de navegação entre unidades (esquerda) */}
        <View
          style={[
            styles.shopRailSlot,
            { width: DESKTOP_LAYOUT_CONSTANTS.SHOP_RAIL_WIDTH },
          ]}
          testID="desktop-explore-shop-rail"
        >
          {shopControls}
        </View>

        {/* Palco central de mídia + controles de mídia abaixo */}
        <View
          style={[
            styles.stageColumn,
            {
              width: metrics.mediaWidth,
              marginLeft: DESKTOP_LAYOUT_CONSTANTS.GAP_COMPACT,
            },
          ]}
          testID="desktop-explore-media-stage"
        >
          <View
            style={[
              styles.mediaFrame,
              {
                width: metrics.mediaWidth,
                height: metrics.mediaHeight,
              },
            ]}
          >
            {media}
          </View>
          <View
            style={[
              styles.mediaControlsSlot,
              {
                width: metrics.mediaWidth,
                height: DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_HEIGHT,
                marginTop: DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_GAP,
              },
            ]}
          >
            {mediaControls}
          </View>
        </View>

        {/* Painel contextual e de agendamento (direita, rolável internamente se exceder a altura) */}
        <View
          style={[
            styles.contextSlot,
            {
              width: metrics.contextWidth,
              marginLeft: DESKTOP_LAYOUT_CONSTANTS.GAP_SIDE_BY_SIDE,
              maxHeight:
                metrics.mediaHeight +
                DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_GAP +
                DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_HEIGHT,
            },
          ]}
          testID="desktop-explore-context-slot"
        >
          {context}
        </View>
      </View>
    );
  }

  // Fallback: modo stacked com rolagem vertical
  return (
    <ScrollView
      style={[styles.baseContainer, style]}
      contentContainerStyle={[
        styles.stackedScrollContent,
        { padding: DESKTOP_LAYOUT_CONSTANTS.INSET },
      ]}
      showsVerticalScrollIndicator={false}
      testID="desktop-explore-stacked"
    >
      {/* Controles de unidade em linha própria no modo empilhado para evitar overflow lateral */}
      <View
        style={[
          styles.stackedShopControlsRow,
          {
            width: metrics.mediaWidth,
            marginBottom: DESKTOP_LAYOUT_CONSTANTS.GAP_COMPACT,
          },
        ]}
      >
        {shopControls}
      </View>

      {/* Palco de mídia */}
      <View
        style={[
          styles.mediaFrame,
          {
            width: metrics.mediaWidth,
            height: metrics.mediaHeight,
          },
        ]}
      >
        {media}
      </View>

      {/* Controles de mídia logo abaixo do palco */}
      <View
        style={[
          styles.mediaControlsSlot,
          {
            width: metrics.mediaWidth,
            height: DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_HEIGHT,
            marginTop: DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_GAP,
          },
        ]}
      >
        {mediaControls}
      </View>

      {/* Painel contextual e reserva abaixo */}
      <View
        style={[
          styles.stackedContextSlot,
          {
            width: metrics.contextWidth,
            marginTop: DESKTOP_LAYOUT_CONSTANTS.GAP_COMPACT,
          },
        ]}
      >
        {context}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  sideBySideRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DESKTOP_LAYOUT_CONSTANTS.INSET,
  },
  shopRailSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#050505',
    position: 'relative',
  },
  mediaControlsSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextSlot: {
    justifyContent: 'center',
  },
  stackedScrollContent: {
    alignItems: 'center',
  },
  stackedShopControlsRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedContextSlot: {
    alignItems: 'stretch',
  },
});
