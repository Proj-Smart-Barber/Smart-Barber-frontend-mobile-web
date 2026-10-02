import { afterEach, describe, expect, it, vi } from 'vitest';
import { getActiveDestinationFromPathname } from '../navigation.helpers';
import { sharePublicCatalog } from '../catalog-share.helper';
import { Animated, Platform, Share } from 'react-native';

describe('Navigation Helpers', () => {
  describe('getActiveDestinationFromPathname', () => {
    it('deve retornar home quando pathname for nulo, indefinido ou vazio', () => {
      expect(getActiveDestinationFromPathname(null)).toBe('home');
      expect(getActiveDestinationFromPathname(undefined)).toBe('home');
      expect(getActiveDestinationFromPathname('')).toBe('home');
    });

    it('deve identificar rota de início / dashboard', () => {
      expect(getActiveDestinationFromPathname('/')).toBe('home');
      expect(getActiveDestinationFromPathname('/(app)')).toBe('home');
      expect(getActiveDestinationFromPathname('/(app)/')).toBe('home');
    });

    it('deve identificar rota de agenda', () => {
      expect(getActiveDestinationFromPathname('/agenda')).toBe('agenda');
      expect(getActiveDestinationFromPathname('/(app)/agenda')).toBe('agenda');
    });

    it('deve identificar rota de horários / disponibilidade', () => {
      expect(getActiveDestinationFromPathname('/availability')).toBe('availability');
      expect(getActiveDestinationFromPathname('/(app)/availability')).toBe('availability');
    });

    it('deve identificar rota de serviços', () => {
      expect(getActiveDestinationFromPathname('/services')).toBe('services');
      expect(getActiveDestinationFromPathname('/(app)/services')).toBe('services');
    });
  });

  describe('Drawer Progress Interpolation & Sincronização', () => {
    it('deve calcular corretamente o slide do drawer de -300 até 0', () => {
      const progress = new Animated.Value(0);
      const slide = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 0],
      });

      expect((slide as any)._interpolation(0)).toBe(-300);
      expect((slide as any)._interpolation(0.5)).toBe(-150);
      expect((slide as any)._interpolation(1)).toBe(0);
    });

    it('deve calcular o deslocamento da página (page shift) para a direita', () => {
      const progress = new Animated.Value(0);
      const pageShift = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 220],
      });

      expect((pageShift as any)._interpolation(0)).toBe(0);
      expect((pageShift as any)._interpolation(1)).toBe(220);
    });

    it('deve atenuar a opacidade da cápsula de 1 para 0 durante abertura do drawer', () => {
      const progress = new Animated.Value(0);
      const capsuleOpacity = progress.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [1, 0, 0],
      });

      expect((capsuleOpacity as any)._interpolation(0)).toBe(1);
      expect((capsuleOpacity as any)._interpolation(0.4)).toBe(0);
      expect((capsuleOpacity as any)._interpolation(1)).toBe(0);
    });
  });

  describe('sharePublicCatalog', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
      vi.restoreAllMocks();
    });

    it('deve compartilhar via navigator.clipboard no ambiente web quando disponível', async () => {
      Platform.OS = 'web';
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      const originalClipboard = (globalThis as any).navigator?.clipboard;
      try {
        Object.defineProperty(globalThis.navigator, 'clipboard', {
          value: { writeText: writeTextMock },
          configurable: true,
        });

        const onSuccess = vi.fn();
        const onError = vi.fn();

        await sharePublicCatalog({
          barbershopId: 'shop-123',
          barbershopName: 'Barbearia Vintage',
          onSuccess,
          onError,
        });

        expect(writeTextMock).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith('Link do catálogo copiado para a área de transferência!');
        expect(onError).not.toHaveBeenCalled();
      } finally {
        if (originalClipboard !== undefined) {
          Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: originalClipboard,
            configurable: true,
          });
        }
      }
    });

    it('deve invocar Share.share no ambiente nativo (iOS/Android)', async () => {
      Platform.OS = 'ios';
      const shareSpy = vi.spyOn(Share, 'share').mockResolvedValueOnce({
        action: Share.sharedAction,
      } as any);

      const onSuccess = vi.fn();
      const onError = vi.fn();

      await sharePublicCatalog({
        barbershopId: 'shop-123',
        barbershopName: 'Barbearia Vintage',
        onSuccess,
        onError,
      });

      expect(shareSpy).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('Link do catálogo compartilhado com sucesso!');
      expect(onError).not.toHaveBeenCalled();
    });

    it('deve chamar onError quando ocorrer erro inesperado no compartilhamento nativo', async () => {
      Platform.OS = 'android';
      vi.spyOn(Share, 'share').mockRejectedValueOnce(new Error('Falha no compartilhamento'));

      const onSuccess = vi.fn();
      const onError = vi.fn();

      await sharePublicCatalog({
        barbershopId: 'shop-123',
        onSuccess,
        onError,
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
