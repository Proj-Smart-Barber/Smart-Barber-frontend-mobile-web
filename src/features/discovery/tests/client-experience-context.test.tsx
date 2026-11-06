// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let mockPathname = '/(client)';

vi.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

import {
  ClientExperienceProvider,
  useClientExperienceContext,
  type ActiveClientMedia,
} from '../model/client-experience-context';

const sampleMedia: ActiveClientMedia = {
  shopId: 'shop-123',
  shopName: 'Barbearia Vintage',
  mediaId: 'media-456',
  service: {
    id: 'srv-789',
    title: 'Corte Clássico',
    priceInCents: 5000,
    durationInMinutes: 45,
  },
};

describe('ClientExperienceContext — Tarefa 2: Gestão de Contexto e Ação Agendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/(client)';
  });

  it('inicia com activeMedia e bookingStart nulos', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result } = renderHook(() => useClientExperienceContext(), { wrapper });

    expect(result.current.activeMedia).toBeNull();
    expect(result.current.bookingStart).toBeNull();
  });

  it('publicar uma mídia não abre reserva automaticamente', () => {
    mockPathname = '/(client)/explore';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result } = renderHook(() => useClientExperienceContext(), { wrapper });

    act(() => {
      result.current.publishActiveMedia(sampleMedia);
    });

    expect(result.current.activeMedia).toEqual(sampleMedia);
    expect(result.current.bookingStart).toBeNull();
  });

  it('inicia reserva contextual quando no feed com mídia ativa', () => {
    mockPathname = '/(client)/explore';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result } = renderHook(() => useClientExperienceContext(), { wrapper });

    act(() => {
      result.current.publishActiveMedia(sampleMedia);
    });

    act(() => {
      result.current.requestBooking();
    });

    expect(result.current.bookingStart).toEqual({
      kind: 'contextual',
      context: sampleMedia,
    });
  });

  it('congela o contexto no início do pedido mesmo se a mídia mudar depois', () => {
    mockPathname = '/(client)/explore';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result } = renderHook(() => useClientExperienceContext(), { wrapper });

    act(() => {
      result.current.publishActiveMedia(sampleMedia);
    });

    act(() => {
      result.current.requestBooking();
    });

    // Atualização posterior da mídia no feed não deve afetar o bookingStart já disparado
    act(() => {
      result.current.publishActiveMedia({
        ...sampleMedia,
        shopId: 'shop-999',
        service: { id: 'srv-999', title: 'Barba', priceInCents: 3000, durationInMinutes: 30 },
      });
    });

    expect(result.current.bookingStart).toEqual({
      kind: 'contextual',
      context: sampleMedia,
    });
  });

  it('fora do feed, requestBooking gera pedido general sem reutilizar mídia anterior', () => {
    mockPathname = '/(client)/explore';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result, rerender } = renderHook(() => useClientExperienceContext(), { wrapper });

    act(() => {
      result.current.publishActiveMedia(sampleMedia);
    });

    // Usuário navega para fora do feed (ex: tela Início)
    mockPathname = '/(client)';
    rerender();

    act(() => {
      result.current.requestBooking();
    });

    // Deve ser kind general, NUNCA contextual fora do feed
    expect(result.current.bookingStart).toEqual({ kind: 'general' });
  });

  it('duplo toque em requestBooking produz uma única solicitação', () => {
    mockPathname = '/(client)/explore';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result } = renderHook(() => useClientExperienceContext(), { wrapper });

    act(() => {
      result.current.publishActiveMedia(sampleMedia);
      result.current.requestBooking();
      result.current.requestBooking();
    });

    expect(result.current.bookingStart).toEqual({
      kind: 'contextual',
      context: sampleMedia,
    });
  });

  it('closeBooking limpa o pedido e permite nova solicitação legítima', () => {
    mockPathname = '/(client)';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClientExperienceProvider actorId="user-1">{children}</ClientExperienceProvider>
    );

    const { result } = renderHook(() => useClientExperienceContext(), { wrapper });

    act(() => {
      result.current.requestBooking();
    });
    expect(result.current.bookingStart).toEqual({ kind: 'general' });

    act(() => {
      result.current.closeBooking();
    });
    expect(result.current.bookingStart).toBeNull();

    // Nova solicitação permitida
    act(() => {
      result.current.requestBooking();
    });
    expect(result.current.bookingStart).toEqual({ kind: 'general' });
  });

  it('limpa contexto e pedido ao trocar de ator ou fazer logout', () => {
    mockPathname = '/(client)/explore';
    let currentActor: string | null = 'user-1';

    const { result, rerender } = renderHook(() => useClientExperienceContext(), {
      wrapper: ({ children }) => (
        <ClientExperienceProvider actorId={currentActor}>{children}</ClientExperienceProvider>
      ),
    });

    act(() => {
      result.current.publishActiveMedia(sampleMedia);
      result.current.requestBooking();
    });

    expect(result.current.bookingStart).not.toBeNull();

    // Troca de ator
    currentActor = 'user-2';
    rerender();

    expect(result.current.activeMedia).toBeNull();
    expect(result.current.bookingStart).toBeNull();
  });
});
