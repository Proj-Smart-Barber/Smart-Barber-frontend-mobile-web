import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'expo-router';
const ClientExperienceContext = createContext(null);
function isFeedPath(pathname) {
    if (!pathname)
        return false;
    return pathname === '/(client)/explore' || pathname === '/explore';
}
export function ClientExperienceProvider({ actorId, children, }) {
    let pathname = '';
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        pathname = usePathname();
    }
    catch {
        pathname = '';
    }
    const [activeMedia, setActiveMedia] = useState(null);
    const [bookingStart, setBookingStart] = useState(null);
    const [locationOnboarding, setLocationOnboarding] = useState(null);
    const activeMediaRef = useRef(null);
    activeMediaRef.current = activeMedia;
    const isRequestingRef = useRef(false);
    const previousActorIdRef = useRef(actorId);
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
    const publishActiveMedia = useCallback((value) => {
        activeMediaRef.current = value;
        setActiveMedia(value);
    }, []);
    const publishLocationOnboarding = useCallback((value) => {
        setLocationOnboarding(value);
    }, []);
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
            const snapshot = {
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
        }
        else {
            // Fora do feed ou sem mídia ativa: seleção geral
            setBookingStart({ kind: 'general' });
        }
    }, [pathname, bookingStart]);
    const closeBooking = useCallback(() => {
        isRequestingRef.current = false;
        setBookingStart(null);
    }, []);
    const value = {
        activeMedia,
        bookingStart,
        locationOnboarding,
        publishActiveMedia,
        publishLocationOnboarding,
        requestBooking,
        closeBooking,
    };
    return (<ClientExperienceContext.Provider value={value}>
      {children}
    </ClientExperienceContext.Provider>);
}
export function useClientExperienceContext() {
    const context = useContext(ClientExperienceContext);
    if (!context) {
        throw new Error('useClientExperienceContext deve ser utilizado dentro de um ClientExperienceProvider');
    }
    return context;
}
export function useOptionalClientExperienceContext() {
    return useContext(ClientExperienceContext);
}
