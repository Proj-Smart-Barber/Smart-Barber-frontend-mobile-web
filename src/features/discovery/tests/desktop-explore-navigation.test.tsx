// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import {
  DesktopShopControls,
  DesktopMediaControls,
  DesktopExploreKeyboardContainer,
} from '../ui/desktop-explore-controls';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

describe('D5 — DesktopExploreControls & Navegação por Teclado Local', () => {
  describe('DesktopShopControls', () => {
    it('desabilita botão anterior no primeiro item e desabilita próximo no fim sem página pendente', () => {
      render(
        <ThemeProvider>
          <DesktopShopControls
            currentIndex={0}
            totalCount={3}
            hasPrevious={false}
            hasNext={true}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        </ThemeProvider>,
      );

      const prevBtn = screen.getByRole('button', { name: /Barbearia anterior/i });
      const nextBtn = screen.getByRole('button', { name: /Próxima barbearia/i });

      expect(prevBtn.getAttribute('aria-disabled') === 'true' || (prevBtn as HTMLButtonElement).disabled).toBe(true);
      expect(nextBtn.getAttribute('aria-disabled') === 'false' || !(nextBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('exibe indicador de espera quando isLoadingNextPage for verdadeiro', () => {
      render(
        <ThemeProvider>
          <DesktopShopControls
            currentIndex={2}
            totalCount={3}
            hasPrevious={true}
            hasNext={true}
            isLoadingNextPage={true}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        </ThemeProvider>,
      );

      expect(screen.getByLabelText(/Carregando mais barbearias/i)).toBeDefined();
    });

    it('chama onPrevious e onNext ao clicar nos botões habilitados', () => {
      const onPrevious = vi.fn();
      const onNext = vi.fn();

      render(
        <ThemeProvider>
          <DesktopShopControls
            currentIndex={1}
            totalCount={3}
            hasPrevious={true}
            hasNext={true}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </ThemeProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: /Barbearia anterior/i }));
      expect(onPrevious).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Próxima barbearia/i }));
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('DesktopMediaControls', () => {
    it('exibe contador correto e desabilita setas nos limites de mídia', () => {
      render(
        <ThemeProvider>
          <DesktopMediaControls
            currentIndex={0}
            totalCount={4}
            hasPrevious={false}
            hasNext={true}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('1 de 4')).toBeDefined();

      const prevBtn = screen.getByRole('button', { name: /Mídia anterior/i });
      const nextBtn = screen.getByRole('button', { name: /Próxima mídia/i });

      expect(prevBtn.getAttribute('aria-disabled') === 'true' || (prevBtn as HTMLButtonElement).disabled).toBe(true);
      expect(nextBtn.getAttribute('aria-disabled') === 'false' || !(nextBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('chama onPrevious e onNext ao interagir com as setas de mídia', () => {
      const onPrevious = vi.fn();
      const onNext = vi.fn();

      render(
        <ThemeProvider>
          <DesktopMediaControls
            currentIndex={2}
            totalCount={4}
            hasPrevious={true}
            hasNext={true}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </ThemeProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: /Mídia anterior/i }));
      expect(onPrevious).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Próxima mídia/i }));
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('DesktopExploreKeyboardContainer', () => {
    it('responde a setas direcionais apenas no container local e ignora inputs de texto', () => {
      const onPreviousShop = vi.fn();
      const onNextShop = vi.fn();
      const onPreviousMedia = vi.fn();
      const onNextMedia = vi.fn();

      render(
        <DesktopExploreKeyboardContainer
          onPreviousShop={onPreviousShop}
          onNextShop={onNextShop}
          onPreviousMedia={onPreviousMedia}
          onNextMedia={onNextMedia}
        >
          <input data-testid="search-input" type="text" />
          <div data-testid="feed-content">Conteúdo do Feed</div>
        </DesktopExploreKeyboardContainer>,
      );

      const container = screen.getByTestId('desktop-keyboard-nav-container');

      // Setas no container navegam
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      expect(onPreviousShop).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(container, { key: 'ArrowDown' });
      expect(onNextShop).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(container, { key: 'ArrowLeft' });
      expect(onPreviousMedia).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(container, { key: 'ArrowRight' });
      expect(onNextMedia).toHaveBeenCalledTimes(1);

      // Setas em campos de input NÃO são capturadas (não intercepta digitação do usuário)
      const input = screen.getByTestId('search-input');
      fireEvent.keyDown(input, { key: 'ArrowLeft' });
      expect(onPreviousMedia).toHaveBeenCalledTimes(1); // Continua 1

      fireEvent.keyDown(input, { key: 'ArrowRight' });
      expect(onNextMedia).toHaveBeenCalledTimes(1); // Continua 1
    });

    it('não executa navegação quando disabled for verdadeiro', () => {
      const onNextShop = vi.fn();

      render(
        <DesktopExploreKeyboardContainer
          disabled={true}
          onPreviousShop={vi.fn()}
          onNextShop={onNextShop}
          onPreviousMedia={vi.fn()}
          onNextMedia={vi.fn()}
        >
          <div>Inerte</div>
        </DesktopExploreKeyboardContainer>,
      );

      const container = screen.getByTestId('desktop-keyboard-nav-container');
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      expect(onNextShop).not.toHaveBeenCalled();
    });
  });
});
