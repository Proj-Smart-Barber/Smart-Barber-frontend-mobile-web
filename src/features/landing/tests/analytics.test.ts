import { describe, it, expect } from 'vitest';
import { trackLandingEvent, registerAnalyticsListener, LandingEvent } from '../lib/analytics';

describe('Landing Page Analytics Sanitization', () => {
  it('registra e despacha eventos sem vazar dados pessoais ou texto livre', () => {
    const receivedEvents: LandingEvent[] = [];
    const unsubscribe = registerAnalyticsListener((event) => {
      receivedEvents.push(event);
    });

    trackLandingEvent({
      name: 'landing_cta_click',
      properties: { audience: 'barber', position: 'hero', target: 'Solicitar demonstração' },
    });

    trackLandingEvent({
      name: 'demo_form_start',
      properties: { origin: 'direct' },
    });

    trackLandingEvent({
      name: 'demo_form_valid',
      properties: {
        professionalsRange: '2-5',
        hasConfiguration: true,
        hasNeed: false,
      },
    });

    trackLandingEvent({
      name: 'whatsapp_handoff_click',
      properties: {
        professionalsRange: '2-5',
        hasConfiguration: true,
        hasNeed: false,
      },
    });

    unsubscribe();

    expect(receivedEvents).toHaveLength(4);

    // Validação estrita de propriedades: nenhum evento pode conter nome, telefone, cidade ou URL
    for (const evt of receivedEvents) {
      const props = (evt.properties ?? {}) as Record<string, unknown>;
      expect(props).not.toHaveProperty('nome');
      expect(props).not.toHaveProperty('name');
      expect(props).not.toHaveProperty('barbearia');
      expect(props).not.toHaveProperty('cidade');
      expect(props).not.toHaveProperty('telefone');
      expect(props).not.toHaveProperty('phone');
      expect(props).not.toHaveProperty('url');
      expect(props).not.toHaveProperty('whatsAppUrl');
      expect(props).not.toHaveProperty('mensagem');
      expect(props).not.toHaveProperty('message');
    }
  });
});
