import { purgePersistedPublicCache } from './public-query-persister';
export async function invalidateCatalogConsumers(client, shopId) {
    await purgePersistedPublicCache();
    await Promise.all([
        client.invalidateQueries({
            predicate: (query) => {
                const [domain, second, third] = query.queryKey;
                if (domain === 'explore-feed' || domain === 'discovery')
                    return true;
                if (!shopId)
                    return domain === 'services' || domain === 'barbershop' || domain === 'gallery';
                return ((domain === 'services' || domain === 'barbershop' || domain === 'gallery') &&
                    (second === shopId || third === shopId));
            },
        }),
    ]);
}
/** Transport events contain a route template and status only, never the mutation payload. */
export function attachCatalogMutationInvalidation(client, transport) {
    let timer;
    const detach = transport.subscribeTelemetry((event) => {
        if (event.method === 'GET' || event.status < 200 || event.status >= 300)
            return;
        const route = event.sanitizedPath;
        const catalog = (route.startsWith('/api/barbershops') &&
            !/bookings|finance|customers|invitations|schedule|availability/.test(route)) ||
            route.startsWith('/api/reviews') ||
            route.endsWith('/review') ||
            (route.startsWith('/api/media/') && event.method === 'DELETE');
        if (!catalog)
            return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            void invalidateCatalogConsumers(client);
        }, 0);
    });
    return () => {
        clearTimeout(timer);
        detach();
    };
}
