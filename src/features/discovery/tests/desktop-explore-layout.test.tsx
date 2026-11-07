// @vitest-environment happy-dom
import React from 'react';
import { View, Text } from 'react-native';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  calculateDesktopExploreLayout,
  DESKTOP_LAYOUT_CONSTANTS,
} from '../lib/desktop-explore-layout';
import { DesktopExploreLayout } from '../ui/desktop-explore-layout';

describe('D1 — calculateDesktopExploreLayout (Geometria e Composição)', () => {
  it('retorna unmeasured e zeros para dimensões inválidas ou não medidas', () => {
    expect(calculateDesktopExploreLayout({ width: 0, height: 0 })).toEqual({
      mode: 'unmeasured',
      mediaWidth: 0,
      mediaHeight: 0,
      contextWidth: 0,
      needsVerticalScroll: false,
    });

    expect(calculateDesktopExploreLayout({ width: -500, height: 800 })).toEqual({
      mode: 'unmeasured',
      mediaWidth: 0,
      mediaHeight: 0,
      contextWidth: 0,
      needsVerticalScroll: false,
    });

    expect(calculateDesktopExploreLayout({ width: NaN, height: 800 })).toEqual({
      mode: 'unmeasured',
      mediaWidth: 0,
      mediaHeight: 0,
      contextWidth: 0,
      needsVerticalScroll: false,
    });

    expect(calculateDesktopExploreLayout({ width: 1000, height: Infinity })).toEqual({
      mode: 'unmeasured',
      mediaWidth: 0,
      mediaHeight: 0,
      contextWidth: 0,
      needsVerticalScroll: false,
    });
  });

  it('calcula modo side-by-side para espaço amplo (1160x820 pós-sidebar)', () => {
    const result = calculateDesktopExploreLayout({ width: 1160, height: 820 });

    expect(result.mode).toBe('side-by-side');
    expect(result.needsVerticalScroll).toBe(false);

    // Mídia dentro dos limites [280, 520]
    expect(result.mediaWidth).toBeGreaterThanOrEqual(DESKTOP_LAYOUT_CONSTANTS.MEDIA_MIN_WIDTH);
    expect(result.mediaWidth).toBeLessThanOrEqual(DESKTOP_LAYOUT_CONSTANTS.MEDIA_MAX_WIDTH);

    // Painel contextual dentro de [300, 360]
    expect(result.contextWidth).toBeGreaterThanOrEqual(DESKTOP_LAYOUT_CONSTANTS.PANEL_MIN_WIDTH);
    expect(result.contextWidth).toBeLessThanOrEqual(DESKTOP_LAYOUT_CONSTANTS.PANEL_MAX_WIDTH);

    // Proporção 9:16 da mídia preservada
    const ratio = result.mediaWidth / result.mediaHeight;
    expect(Math.abs(ratio - 9 / 16)).toBeLessThan(0.02);

    // Encaixe total dentro de width pós-sidebar
    const totalHorizontal =
      DESKTOP_LAYOUT_CONSTANTS.INSET * 2 +
      DESKTOP_LAYOUT_CONSTANTS.SHOP_RAIL_WIDTH +
      DESKTOP_LAYOUT_CONSTANTS.GAP_COMPACT +
      result.mediaWidth +
      DESKTOP_LAYOUT_CONSTANTS.GAP_SIDE_BY_SIDE +
      result.contextWidth;
    expect(totalHorizontal).toBeLessThanOrEqual(1160);

    // Encaixe vertical da mídia + controle de mídia dentro da altura
    const totalVertical =
      DESKTOP_LAYOUT_CONSTANTS.INSET * 2 +
      result.mediaHeight +
      DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_GAP +
      DESKTOP_LAYOUT_CONSTANTS.MEDIA_CONTROLS_HEIGHT;
    expect(totalVertical).toBeLessThanOrEqual(820);
  });

  it('limita frame de mídia ao teto de 520px em telas grandes (1920x1080)', () => {
    const result = calculateDesktopExploreLayout({ width: 1920, height: 1080 });

    expect(result.mode).toBe('side-by-side');
    expect(result.mediaWidth).toBe(520);
    expect(result.mediaHeight).toBe(Math.round((520 * 16) / 9)); // 924
    expect(result.contextWidth).toBe(DESKTOP_LAYOUT_CONSTANTS.PANEL_MAX_WIDTH);
    expect(result.needsVerticalScroll).toBe(false);
  });

  it('faz fallback para stacked em espaço insuficiente (744x688 pós-sidebar)', () => {
    const result = calculateDesktopExploreLayout({ width: 744, height: 688 });

    expect(result.mode).toBe('stacked');
    expect(result.needsVerticalScroll).toBe(true);
    expect(result.mediaWidth).toBeGreaterThan(0);
    expect(result.mediaHeight).toBeGreaterThan(0);
    expect(result.contextWidth).toBeGreaterThan(0);

    // Proporção 9:16 preservada no fallback
    const ratio = result.mediaWidth / result.mediaHeight;
    expect(Math.abs(ratio - 9 / 16)).toBeLessThan(0.02);
  });

  it('faz fallback para stacked se a altura útil for insuficiente para o frame mínimo de 280px', () => {
    // 1200 de largura, mas apenas 400 de altura
    const result = calculateDesktopExploreLayout({ width: 1200, height: 400 });

    expect(result.mode).toBe('stacked');
    expect(result.needsVerticalScroll).toBe(true);
  });

  it('renderiza os slots corretamente no modo side-by-side', () => {
    const metrics = calculateDesktopExploreLayout({ width: 1200, height: 800 });
    render(
      <DesktopExploreLayout
        metrics={metrics}
        media={<Text>Media Slot</Text>}
        context={<Text>Context Slot</Text>}
        shopControls={<Text>Shop Controls Slot</Text>}
        mediaControls={<Text>Media Controls Slot</Text>}
      />
    );

    expect(screen.getByTestId('desktop-explore-side-by-side')).toBeDefined();
    expect(screen.getByText('Media Slot')).toBeDefined();
    expect(screen.getByText('Context Slot')).toBeDefined();
    expect(screen.getByText('Shop Controls Slot')).toBeDefined();
    expect(screen.getByText('Media Controls Slot')).toBeDefined();
  });

  it('renderiza os slots com ScrollView no modo stacked', () => {
    const metrics = calculateDesktopExploreLayout({ width: 744, height: 688 });
    render(
      <DesktopExploreLayout
        metrics={metrics}
        media={<Text>Media Stacked</Text>}
        context={<Text>Context Stacked</Text>}
        shopControls={<Text>Shop Stacked</Text>}
        mediaControls={<Text>Controls Stacked</Text>}
      />
    );

    expect(screen.getByTestId('desktop-explore-stacked')).toBeDefined();
    expect(screen.getByText('Media Stacked')).toBeDefined();
    expect(screen.getByText('Context Stacked')).toBeDefined();
  });

  it('renderiza container neutro quando unmeasured', () => {
    const metrics = calculateDesktopExploreLayout({ width: 0, height: 0 });
    render(
      <DesktopExploreLayout
        metrics={metrics}
        media={<Text>No Media</Text>}
        context={<Text>No Context</Text>}
        shopControls={<Text>No Shop</Text>}
        mediaControls={<Text>No Controls</Text>}
      />
    );

    expect(screen.getByTestId('desktop-explore-unmeasured')).toBeDefined();
    expect(screen.queryByText('No Media')).toBeNull();
  });
});
