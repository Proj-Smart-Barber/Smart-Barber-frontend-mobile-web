import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'expo-router';
import type { LocationOnboardingStage } from './use-client-location-onboarding';

export type ActiveClientMedia = {
  shopId: string;
  shopName: string;
  mediaId: string;
  service: {
    id: string;
    title: string;
    priceInCents: number;
    durationInMinutes: number;
  } | null;
};

export type BookingStart =
  | { kind: 'contextual'; context: ActiveClientMedia }
  | { kind: 'general' };

export interface ClientLocationOnboardingBridge {
  stage: LocationOnboardingStage;
  canAskAgain: boolean;
  recoverPermission: () => Promise<void>;
  retryPosition: () => Promise<void>;
}

export interface ClientExperienceContextValue {
  activeMedia: ActiveClientMedia | null;
  bookingStart: BookingStart | null;
  locationOnboarding: ClientLocationOnboardingBridge | null;
  publishActiveMedia: (value: ActiveClientMedia | null) => void;
  publishLocationOnboarding: (value: ClientLocationOnboardingBridge | null) => void;
  requestBooking: () => void;
  closeBooking: () => void;
}

const ClientExperienceContext = createContext<ClientExperienceContextValue | null>(null);

export interface ClientExperienceProviderProps {
  actorId?: string | null;
  children: React.ReactNode;
}

function isFeedPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/(client)/explore' || pathname === '/explore';
}

export function ClientExperienceProvider({
  actorId,
  children,
}: ClientExperienceProviderProps) {
  let pathname = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pathname = usePathname();
  } catch {
    pathname = '';
  }

  const [activeMedia, setActiveMedia] = useState<ActiveClientMedia | null>(null);
  const [bookingStart, setBookingStart] = useState<BookingStart | null>(null);
  const [locationOnboarding, setLocationOnboarding] =
    useState<ClientLocationOnboardingBridge | null>(null);

  const activeMediaRef = useRef<ActiveClientMedia | null>(null);
  activeMediaRef.current = activeMedia;

  const isRequestingRef = useRef(false);
  const previousActorIdRef = useRef<string | null | undefined>(actorId);

  // Limpeza de contexto volátil e pedido em caso de logout ou troca de ator
  useEffect(() => {
    if (previousActorIdRef.current !== actorId) {
      previousActorIdRef.current = actorId;
      setActiveMedia(null);
      setBookingStart(null);
      activeMediaRef.current = null;
      isRequestingRef.current = false;
    }
  }, [actorId]);

  const publishActiveMedia = useCallback((value: ActiveClientMedia | null) => {
    activeMediaRef.current = value;
    setActiveMedia(value);
  }, []);

  const publishLocationOnboarding = useCallback(
    (value: ClientLocationOnboardingBridge | null) => {
      setLocationOnboarding(value);
    },
    [],
  );

  const requestBooking = useCallback(() => {
    // Duplo toque / chamadas concorrentes produzem uma única solicitação
    if (isRequestingRef.current || bookingStart !== null) {
      return;
    }

    isRequestingRef.current = true;

    // Somente a mídia efetivamente ativa no feed pode fornecer contexto de reserva
    const onFeed = isFeedPath(pathname);
    const currentMedia = activeMediaRef.current;

    if (onFeed && currentMedia && currentMedia.shopId) {
      // Captura cópia imutável do contexto para que navegações ou rolagens posteriores não o alterem
      const snapshot: ActiveClientMedia = {
        shopId: currentMedia.shopId,
        shopName: currentMedia.shopName,
        mediaId: currentMedia.mediaId,
        service: currentMedia.service
          ? {
              id: currentMedia.service.id,
              title: currentMedia.service.title,
              priceInCents: currentMedia.service.priceInCents,
              durationInMinutes: currentMedia.service.durationInMinutes,
            }
          : null,
      };

      setBookingStart({
        kind: 'contextual',
        context: snapshot,
      });
    } else {
      // Fora do feed ou sem mídia ativa: seleção geral
      setBookingStart({ kind: 'general' });
    }
  }, [pathname, bookingStart]);

  const closeBooking = useCallback(() => {
    isRequestingRef.current = false;
    setBookingStart(null);
  }, []);

  const value: ClientExperienceContextValue = {
    activeMedia,
    bookingStart,
    locationOnboarding,
    publishActiveMedia,
    publishLocationOnboarding,
    requestBooking,
    closeBooking,
  };

  return (
    <ClientExperienceContext.Provider value={value}>
      {children}
    </ClientExperienceContext.Provider>
  );
}

export function useClientExperienceContext(): ClientExperienceContextValue {
  const context = useContext(ClientExperienceContext);
  if (!context) {
    throw new Error('useClientExperienceContext deve ser utilizado dentro de um ClientExperienceProvider');
  }
  return context;
}

export function useOptionalClientExperienceContext(): ClientExperienceContextValue | null {
  return useContext(ClientExperienceContext);
}
