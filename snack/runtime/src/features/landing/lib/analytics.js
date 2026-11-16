/**
 * Dispatcher de eventos analíticos da Landing Page.
 * Tipagem estrita que proíbe em tempo de compilação qualquer dado pessoal (PII),
 * texto livre, número de telefone ou URL do WhatsApp.
 */
const listeners = new Set();
export function registerAnalyticsListener(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export function trackLandingEvent(event) {
    if (process.env.NODE_ENV === 'development') {
        // Log seguro apenas de categorias e contadores
        // eslint-disable-next-line no-console
        console.debug('[LandingAnalytics]', event.name, event.properties);
    }
    listeners.forEach((listener) => {
        try {
            listener(event);
        }
        catch {
            // Falhas em listeners analíticos jamais bloqueiam o usuário
        }
    });
}
