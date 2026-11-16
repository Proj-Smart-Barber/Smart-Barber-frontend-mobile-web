// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const raw = vi.hoisted(() => ({ top: 360, bottom: 180, left: 0, right: 0 }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => raw }));
import { AppSafeAreaView } from '../AppSafeAreaView';
afterEach(cleanup);

it('bounds inflated WebKit padding without applying a second safe-area wrapper', () => {
  const view = render(<AppSafeAreaView testID="surface" edges={['top', 'left', 'right']} />);
  const style = getComputedStyle(view.getByTestId('surface'));
  expect(style.paddingTop).toBe('64px');
  expect(style.paddingBottom).toBe('0px');
});

it('keeps the gesture-area protection bounded for full-screen booking details', () => {
  const view = render(<AppSafeAreaView testID="surface" />);
  const style = getComputedStyle(view.getByTestId('surface'));
  expect(style.paddingBottom).toBe('34px');
});
