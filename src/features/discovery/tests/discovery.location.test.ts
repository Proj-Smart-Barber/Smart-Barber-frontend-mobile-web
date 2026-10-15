import { describe, it, expect, beforeEach } from 'vitest';
import { locationStore } from '../model/location-provider';

describe('EphemeralLocationStore', () => {
  beforeEach(() => {
    locationStore.reset();
  });

  it('deve inicializar no estado idle sem coordenadas', () => {
    const session = locationStore.getSession();
    expect(session.state).toBe('idle');
    expect(session.coords).toBeNull();
    expect(session.generationId).toBeDefined();
  });

  it('deve atualizar para granted com coordenadas e gerar novo generationId opaco', () => {
    const initialGenId = locationStore.getSession().generationId;

    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55052,
        longitude: -46.633308,
        accuracyMeters: 15,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    const session = locationStore.getSession();
    expect(session.state).toBe('granted');
    expect(session.coords?.latitude).toBe(-23.55052);
    expect(session.coords?.longitude).toBe(-46.633308);
    expect(session.coords?.accuracyMeters).toBe(15);
    expect(session.generationId).not.toBe(initialGenId);
  });

  it('deve tratar permissão negada limpando coordenadas e marcando denied', () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55,
        longitude: -46.63,
        accuracyMeters: 10,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    locationStore.updateSession({
      state: 'denied',
      coords: null,
      errorMessage: 'Permissão de localização negada pelo usuário.',
    });
    const session = locationStore.getSession();

    expect(session.state).toBe('denied');
    expect(session.coords).toBeNull();
    expect(session.errorMessage).toBe('Permissão de localização negada pelo usuário.');
  });

  it('deve marcar localização como obsoleta (stale) quando o timestamp exceder o limite de expiração', () => {
    // Simula coordenadas salvas há mais de 15 minutos (16 minutos atrás)
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;

    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55,
        longitude: -46.63,
        accuracyMeters: 10,
        timestamp: sixteenMinutesAgo,
        isApproximate: false,
      },
    });

    const session = locationStore.getSession();

    expect(session.state).toBe('stale');
    expect(session.coords?.latitude).toBe(-23.55);
  });

  it('deve notificar subscribers ao alterar o estado', () => {
    let notified = false;
    const unsubscribe = locationStore.subscribe((session) => {
      if (session.state === 'granted') {
        notified = true;
      }
    });

    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55,
        longitude: -46.63,
        accuracyMeters: 10,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    expect(notified).toBe(true);
    unsubscribe();
  });
});
