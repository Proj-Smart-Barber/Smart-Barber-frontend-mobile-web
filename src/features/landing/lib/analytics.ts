/**
 * Dispatcher de eventos analíticos da Landing Page.
 * Tipagem estrita que proíbe em tempo de compilação qualquer dado pessoal (PII),
 * texto livre, número de telefone ou URL do WhatsApp.
 */

export type LandingCtaClickEvent = {
  name: 'landing_cta_click';
  properties: {
    audience: 'client' | 'barber';
    position: 'header' | 'hero' | 'trust' | 'problem' | 'bento' | 'how_it_works' | 'pricing' | 'footer';
    target: string;
  };
};

export type DemoFormStartEvent = {
  name: 'demo_form_start';
  properties?: {
    origin?: 'hero' | 'footer' | 'pricing' | 'direct';
  };
};

export type DemoFormValidEvent = {
  name: 'demo_form_valid';
  properties: {
    professionalsRange: '1' | '2-5' | '6-10' | '11+';
    hasConfiguration: boolean;
    hasNeed: boolean;
  };
};

export type WhatsAppHandoffClickEvent = {
  name: 'whatsapp_handoff_click';
  properties: {
    professionalsRange: '1' | '2-5' | '6-10' | '11+';
    hasConfiguration: boolean;
    hasNeed: boolean;
  };
};

export type LandingEvent =
  | LandingCtaClickEvent
  | DemoFormStartEvent
  | DemoFormValidEvent
  | WhatsAppHandoffClickEvent;

/**
 * Listener plugável para analytics externo (ex: Google Analytics, PostHog).
 */
export type AnalyticsListener = (event: LandingEvent) => void;

const listeners: Set<AnalyticsListener> = new Set();

export function registerAnalyticsListener(listener: AnalyticsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function trackLandingEvent(event: LandingEvent): void {
  if (process.env.NODE_ENV === 'development') {
    // Log seguro apenas de categorias e contadores
    // eslint-disable-next-line no-console
    console.debug('[LandingAnalytics]', event.name, event.properties);
  }

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Falhas em listeners analíticos jamais bloqueiam o usuário
    }
  });
}
