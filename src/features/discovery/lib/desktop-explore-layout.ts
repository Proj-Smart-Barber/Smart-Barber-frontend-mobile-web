export const DESKTOP_LAYOUT_CONSTANTS = {
  INSET: 16,
  GAP_SIDE_BY_SIDE: 24,
  GAP_COMPACT: 12,
  MEDIA_MIN_WIDTH: 280,
  MEDIA_MAX_WIDTH: 520,
  PANEL_MIN_WIDTH: 300,
  PANEL_MAX_WIDTH: 360,
  SHOP_RAIL_WIDTH: 44,
  MEDIA_CONTROLS_HEIGHT: 44,
  MEDIA_CONTROLS_GAP: 12,
  ASPECT_RATIO_W: 9,
  ASPECT_RATIO_H: 16,
} as const;

export type DesktopExploreLayoutMode = 'unmeasured' | 'side-by-side' | 'stacked';

export interface DesktopExploreLayoutInput {
  width: number;
  height: number;
}

export interface DesktopExploreLayoutResult {
  mode: DesktopExploreLayoutMode;
  mediaWidth: number;
  mediaHeight: number;
  contextWidth: number;
  needsVerticalScroll: boolean;
}

/**
 * Calcula a geometria pura da variante desktop do Explorar a partir das dimensões
 * reais do workspace (abaixo do cabeçalho de abas e após a sidebar global).
 *
 * Preserva estritamente a proporção 9:16 da mídia (contain) e seleciona modo
 * lado a lado quando houver respiro real ou fallback empilhado quando o espaço for compacto.
 */
export function calculateDesktopExploreLayout({
  width,
  height,
}: DesktopExploreLayoutInput): DesktopExploreLayoutResult {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      mode: 'unmeasured',
      mediaWidth: 0,
      mediaHeight: 0,
      contextWidth: 0,
      needsVerticalScroll: false,
    };
  }

  const {
    INSET,
    GAP_SIDE_BY_SIDE,
    GAP_COMPACT,
    MEDIA_MIN_WIDTH,
    MEDIA_MAX_WIDTH,
    PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH,
    SHOP_RAIL_WIDTH,
    MEDIA_CONTROLS_HEIGHT,
    MEDIA_CONTROLS_GAP,
    ASPECT_RATIO_W,
    ASPECT_RATIO_H,
  } = DESKTOP_LAYOUT_CONSTANTS;

  const availWidth = width - INSET * 2;
  const availHeight = height - INSET * 2;

  // Altura disponível para a mídia vertical (descontando o controle inferior de mídia e seu gap)
  const maxMediaHeightAvailable = availHeight - MEDIA_CONTROLS_GAP - MEDIA_CONTROLS_HEIGHT;

  if (maxMediaHeightAvailable > 0) {
    // Largura máxima de mídia que cabe na altura preservando proporção 9:16
    const maxWidthFromHeight = Math.floor(
      (maxMediaHeightAvailable * ASPECT_RATIO_W) / ASPECT_RATIO_H,
    );
    const candidateMediaWidth = Math.min(MEDIA_MAX_WIDTH, maxWidthFromHeight);

    // Se candidateMediaWidth >= MEDIA_MIN_WIDTH (280), testamos se cabe lado a lado com painel
    if (candidateMediaWidth >= MEDIA_MIN_WIDTH) {
      // Largura necessária: rail de barbearia (44) + gap compacto (12) + mídia + gap (24)
      const widthBeforeContext =
        SHOP_RAIL_WIDTH + GAP_COMPACT + candidateMediaWidth + GAP_SIDE_BY_SIDE;
      const remainingForContext = availWidth - widthBeforeContext;

      if (remainingForContext >= PANEL_MIN_WIDTH) {
        const contextWidth = Math.min(PANEL_MAX_WIDTH, remainingForContext);
        const mediaHeight = Math.round(
          (candidateMediaWidth * ASPECT_RATIO_H) / ASPECT_RATIO_W,
        );

        return {
          mode: 'side-by-side',
          mediaWidth: candidateMediaWidth,
          mediaHeight,
          contextWidth,
          needsVerticalScroll: false,
        };
      }
    }
  }

  // Fallback: modo stacked (coluna única sem overflow lateral)
  const usefulWidth = Math.max(0, availWidth);
  const mediaWidth =
    usefulWidth >= MEDIA_MIN_WIDTH
      ? Math.min(MEDIA_MAX_WIDTH, usefulWidth)
      : usefulWidth;
  const mediaHeight = Math.round((mediaWidth * ASPECT_RATIO_H) / ASPECT_RATIO_W);
  const contextWidth = Math.min(usefulWidth, MEDIA_MAX_WIDTH);

  return {
    mode: 'stacked',
    mediaWidth,
    mediaHeight,
    contextWidth,
    needsVerticalScroll: true,
  };
}
