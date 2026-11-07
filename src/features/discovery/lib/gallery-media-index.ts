/**
 * Determina o índice de mídia visível baseado no deslocamento horizontal do scroll,
 * largura válida da página e total de itens.
 * Trata larguras inválidas, limites de contorno e valores não finitos.
 */
export function getVisibleMediaIndex(
  offsetX: number,
  pageWidth: number,
  mediaCount: number,
): number {
  if (
    mediaCount <= 1 ||
    pageWidth <= 0 ||
    !Number.isFinite(offsetX) ||
    !Number.isFinite(pageWidth)
  ) {
    return 0;
  }
  const rawIndex = Math.round(offsetX / pageWidth);
  return Math.max(0, Math.min(rawIndex, mediaCount - 1));
}
