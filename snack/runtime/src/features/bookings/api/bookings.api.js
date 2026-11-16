import { serverClock } from '../lib/server-clock';
import { httpClient } from '../../../shared/api/http-client';
import { bookingDtoSchema, fetchUnitBookingsResponseSchema, fetchMyBookingsResponseSchema, customerLookupResultSchema, getBookingAvailabilityResponseSchema, } from './bookings.schema';
export async function createBooking(request, idempotencyKey) {
    var _a;
    const payload = {
        ...request,
        scope: (_a = request.scope) !== null && _a !== void 0 ? _a : 'PERSONAL',
    };
    const response = await httpClient.post('/api/bookings', payload, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return {
        booking: bookingDtoSchema.parse(response.booking),
        serverTime: response.serverTime,
    };
}
export async function createOperationalBooking(shopId, request, idempotencyKey) {
    const payload = {
        ...request,
        shopId,
        scope: 'UNIT',
    };
    const response = await httpClient.post('/api/bookings', payload, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return {
        booking: bookingDtoSchema.parse(response.booking),
        serverTime: response.serverTime,
    };
}
export async function listBarbershopProfessionals(shopId) {
    var _a;
    const response = await httpClient.get(`/api/barbershops/${shopId}/professionals`, { publicRequest: true });
    return (_a = response.professionals) !== null && _a !== void 0 ? _a : [];
}
export async function fetchMyBookings(params, options) {
    const queryParams = new URLSearchParams();
    if (params === null || params === void 0 ? void 0 : params.page) {
        queryParams.set('page', String(params.page));
    }
    if (params === null || params === void 0 ? void 0 : params.limit) {
        queryParams.set('limit', String(params.limit));
    }
    if (params === null || params === void 0 ? void 0 : params.view) {
        queryParams.set('view', params.view);
    }
    if (params === null || params === void 0 ? void 0 : params.filter) {
        queryParams.set('filter', params.filter);
    }
    if (params === null || params === void 0 ? void 0 : params.cursor) {
        queryParams.set('cursor', params.cursor);
    }
    const query = queryParams.toString();
    const url = query ? `/api/bookings/me?${query}` : '/api/bookings/me';
    const response = await httpClient.get(url, (options === null || options === void 0 ? void 0 : options.signal) ? { signal: options.signal } : undefined);
    const parsed = fetchMyBookingsResponseSchema.parse(response);
    return parsed.bookings;
}
export async function fetchUnitBookings(shopId, params, options) {
    var _a;
    const queryParams = new URLSearchParams();
    if (params === null || params === void 0 ? void 0 : params.page)
        queryParams.set('page', String(params.page));
    if (params === null || params === void 0 ? void 0 : params.limit)
        queryParams.set('limit', String(params.limit));
    if (params === null || params === void 0 ? void 0 : params.date)
        queryParams.set('date', params.date);
    if (params === null || params === void 0 ? void 0 : params.status)
        queryParams.set('status', params.status);
    if (params === null || params === void 0 ? void 0 : params.barbermanId)
        queryParams.set('barbermanId', params.barbermanId);
    if (typeof (params === null || params === void 0 ? void 0 : params.includeSummary) === 'boolean') {
        queryParams.set('includeSummary', String(params.includeSummary));
    }
    if (typeof (params === null || params === void 0 ? void 0 : params.bootstrapOnly) === 'boolean') {
        queryParams.set('bootstrapOnly', String(params.bootstrapOnly));
    }
    const query = queryParams.toString();
    const url = query
        ? `/api/barbershops/${shopId}/bookings?${query}`
        : `/api/barbershops/${shopId}/bookings`;
    const sampleMonotonicMs = typeof (options === null || options === void 0 ? void 0 : options.sampleMonotonicMs) === 'number'
        ? options.sampleMonotonicMs
        : typeof performance !== 'undefined'
            ? performance.now()
            : Date.now();
    const expectedGeneration = (_a = options === null || options === void 0 ? void 0 : options.expectedGeneration) !== null && _a !== void 0 ? _a : serverClock.getGeneration();
    const response = await httpClient.get(url, (options === null || options === void 0 ? void 0 : options.signal) ? { signal: options.signal } : undefined);
    const parsed = fetchUnitBookingsResponseSchema.parse(response);
    if (!(options === null || options === void 0 ? void 0 : options.skipAutoSyncClock) && parsed.serverTime && Number.isFinite(Date.parse(parsed.serverTime))) {
        try {
            serverClock.syncWithServer(parsed.serverTime, { sampleMonotonicMs, expectedGeneration });
        }
        catch {
            // Falha fechado sem quebrar o retorno do payload
        }
    }
    return parsed;
}
export async function getBookingById(bookingId, scope = 'PERSONAL', options) {
    var _a;
    const sampleMonotonicMs = typeof (options === null || options === void 0 ? void 0 : options.sampleMonotonicMs) === 'number'
        ? options.sampleMonotonicMs
        : typeof performance !== 'undefined'
            ? performance.now()
            : Date.now();
    const expectedGeneration = (_a = options === null || options === void 0 ? void 0 : options.expectedGeneration) !== null && _a !== void 0 ? _a : serverClock.getGeneration();
    const response = await httpClient.get(`/api/bookings/${bookingId}`, { params: { scope } });
    const booking = bookingDtoSchema.parse(response.booking);
    if (!(options === null || options === void 0 ? void 0 : options.skipAutoSyncClock) && booking.serverTime && Number.isFinite(Date.parse(booking.serverTime))) {
        try {
            serverClock.syncWithServer(booking.serverTime, { sampleMonotonicMs, expectedGeneration });
        }
        catch {
            // Falha fechado sem quebrar o retorno do payload
        }
    }
    return booking;
}
export async function lookupCustomer(shopId, criteria) {
    var _a, _b;
    const hasEmail = Boolean((_a = criteria === null || criteria === void 0 ? void 0 : criteria.email) === null || _a === void 0 ? void 0 : _a.trim());
    const hasCpf = Boolean((_b = criteria === null || criteria === void 0 ? void 0 : criteria.cpf) === null || _b === void 0 ? void 0 : _b.trim());
    if ((hasEmail && hasCpf) || (!hasEmail && !hasCpf)) {
        throw new Error('Forneça exatamente um critério de busca (email ou cpf).');
    }
    const payload = {};
    if (hasEmail)
        payload.email = criteria.email.trim();
    if (hasCpf)
        payload.cpf = criteria.cpf.trim();
    const response = await httpClient.post(`/api/barbershops/${shopId}/customers/lookup`, payload);
    return customerLookupResultSchema.parse(response);
}
export async function cancelBooking(bookingId, request, idempotencyKey) {
    const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
    const response = options
        ? await httpClient.delete(`/api/bookings/${bookingId}/cancel`, request, options)
        : await httpClient.delete(`/api/bookings/${bookingId}/cancel`, request);
    return {
        booking: bookingDtoSchema.parse(response.booking),
        serverTime: response.serverTime,
    };
}
export async function rescheduleBooking(bookingId, request, idempotencyKey) {
    const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
    const response = options
        ? await httpClient.patch(`/api/bookings/${bookingId}/reschedule`, request, options)
        : await httpClient.patch(`/api/bookings/${bookingId}/reschedule`, request);
    return {
        booking: bookingDtoSchema.parse(response.booking),
        serverTime: response.serverTime,
    };
}
export async function transitionBookingStatus(bookingId, request, idempotencyKey) {
    const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
    const response = options
        ? await httpClient.patch(`/api/bookings/${bookingId}/status`, request, options)
        : await httpClient.patch(`/api/bookings/${bookingId}/status`, request);
    return {
        booking: bookingDtoSchema.parse(response.booking),
        serverTime: response.serverTime,
    };
}
export async function getBookingAvailability(shopId, params, signal) {
    var _a;
    const normalizedServiceIds = Array.from(new Set(((_a = params.serviceIds) !== null && _a !== void 0 ? _a : []).map((id) => id.trim()).filter(Boolean))).sort();
    const queryParams = new URLSearchParams();
    queryParams.set('date', params.date);
    queryParams.set('serviceIds', normalizedServiceIds.join(','));
    if (params.barbermanId) {
        queryParams.set('barbermanId', params.barbermanId);
    }
    const expectedGeneration = serverClock.getGeneration();
    const sampleMonotonicMs = performance.now();
    const response = await httpClient.get(`/api/barbershops/${shopId}/availability?${queryParams.toString()}`, { signal, cache: 'no-store' });
    const parsed = getBookingAvailabilityResponseSchema.safeParse(response);
    if (!parsed.success) {
        throw new Error('Resposta de disponibilidade inválida.');
    }
    // Sincroniza o relógio autoritativo se serverTime estiver presente
    if (!parsed.data.serverTime || !Number.isFinite(Date.parse(parsed.data.serverTime))) {
        // Mantém relógio anterior se houver
        throw new Error('Não foi possível sincronizar o horário do servidor. Atualize os horários.');
    }
    if (!(signal === null || signal === void 0 ? void 0 : signal.aborted)) {
        serverClock.syncWithServer(parsed.data.serverTime, {
            expectedGeneration,
            sampleMonotonicMs,
        });
    }
    return parsed.data;
}
