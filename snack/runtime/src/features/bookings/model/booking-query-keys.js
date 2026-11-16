export function normalizeServiceIds(serviceIds) {
    if (!serviceIds || serviceIds.length === 0)
        return [];
    return Array.from(new Set(serviceIds
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0))).sort();
}
export const bookingQueryKeys = {
    all: ['bookings'],
    professionals: (shopId) => ['barbershop', shopId, 'professionals'],
    availability: (shopId, params) => [
        'barbershop',
        shopId,
        'availability',
        {
            ...params,
            serviceIds: normalizeServiceIds(params === null || params === void 0 ? void 0 : params.serviceIds),
        },
    ],
    myBookings: (actorId, params) => ['bookings', 'me', actorId !== null && actorId !== void 0 ? actorId : 'anon', params !== null && params !== void 0 ? params : {}],
    unitBookings: (shopId, params, actorId, role) => role
        ? ['barbershop', shopId, 'bookings', actorId !== null && actorId !== void 0 ? actorId : 'anon', role, params !== null && params !== void 0 ? params : {}]
        : ['barbershop', shopId, 'bookings', actorId !== null && actorId !== void 0 ? actorId : 'anon', params !== null && params !== void 0 ? params : {}],
    unitBookingsBootstrap: (shopId, actorId, role, barbermanId) => ['barbershop', shopId, 'bookings', 'bootstrap', actorId !== null && actorId !== void 0 ? actorId : 'anon', role !== null && role !== void 0 ? role : 'unknown', barbermanId !== null && barbermanId !== void 0 ? barbermanId : 'all'],
    detail: (bookingId, scope, actorId) => ['bookings', 'detail', bookingId, scope !== null && scope !== void 0 ? scope : 'PERSONAL', actorId !== null && actorId !== void 0 ? actorId : 'anon'],
    agenda: (shopId, professionalId, date) => ['agenda', shopId, professionalId !== null && professionalId !== void 0 ? professionalId : 'all', date !== null && date !== void 0 ? date : 'all'],
    dashboard: (shopId, date) => ['dashboard', shopId, date !== null && date !== void 0 ? date : 'today'],
    notifications: (actorId) => ['notifications', actorId !== null && actorId !== void 0 ? actorId : 'anon'],
};
export async function invalidateBookingQueries(queryClient, params) {
    const promises = [];
    // 1. Minhas reservas (pessoal)
    promises.push(queryClient.invalidateQueries({
        queryKey: ['bookings', 'me'],
    }));
    // 2. Detalhe da reserva (se fornecido)
    if (params.bookingId) {
        promises.push(queryClient.invalidateQueries({
            queryKey: ['bookings', 'detail', params.bookingId],
        }));
    }
    // 3. Unidade afetada
    if (params.shopId) {
        // Disponibilidade de horários
        promises.push(queryClient.invalidateQueries({
            queryKey: ['barbershop', params.shopId, 'availability'],
        }));
        // Reservas operacionais da unidade
        promises.push(queryClient.invalidateQueries({
            queryKey: ['barbershop', params.shopId, 'bookings'],
        }));
        // Agendas da unidade (invalida tanto ['agenda', shopId] quanto o formato canônico ['agenda', 'day', shopId])
        promises.push(queryClient.invalidateQueries({
            queryKey: ['agenda', params.shopId],
        }));
        promises.push(queryClient.invalidateQueries({
            queryKey: ['agenda', 'day', params.shopId],
        }));
        // Dashboards da unidade
        promises.push(queryClient.invalidateQueries({
            queryKey: ['dashboard', params.shopId],
        }));
        // Financeiro da unidade (garante atualização de previsão, concluídos e atendimentos após mutação de reserva)
        promises.push(queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'finance' && q.queryKey.includes(params.shopId),
        }));
    }
    else {
        promises.push(queryClient.invalidateQueries({
            queryKey: ['finance'],
        }));
    }
    if (params.actorId)
        promises.push(queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'dashboard' && q.queryKey.includes(params.actorId) }));
    // 4. Notificações do ator
    if (params.actorId) {
        promises.push(queryClient.invalidateQueries({
            queryKey: ['notifications', params.actorId],
        }));
    }
    await Promise.all(promises);
}
