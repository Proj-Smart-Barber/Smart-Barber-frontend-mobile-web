import { z } from 'zod';
import { httpClient } from '../../../shared/api';
const entrySchema = z.object({
    id: z.string(),
    kind: z.enum(['EXPENSE', 'RECEIPT']),
    category: z.string(),
    description: z.string(),
    amountInCents: z.number().int(),
    dueOn: z.string(),
    paidOn: z.string().nullable(),
    payee: z.string(),
    status: z.enum(['PLANNED', 'PAID', 'CANCELLED']),
    version: z.number().int(),
    bookingId: z.string().nullable(),
});
const bookingSchema = z.object({
    id: z.string(),
    date: z.string(),
    status: z.string(),
    professional: z.string(),
    services: z.string(),
    amountInCents: z.number().int().nullable(),
    receiptId: z.string().nullable(),
});
const daySchema = z.object({
    date: z.string(),
    completedInCents: z.number().int(),
    forecastInCents: z.number().int(),
    paidInCents: z.number().int(),
});
const periodSchema = z.object({
    month: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
    today: z.string(),
    timezone: z.string(),
    serverTime: z.string(),
    entries: z.array(entrySchema),
    entriesTotal: z.number().int().optional(),
    bookingsTotal: z.number().int().optional(),
    entriesLimit: z.number().int().optional(),
    bookingsLimit: z.number().int().optional(),
    bookings: z.array(bookingSchema),
    summary: z.object({
        completedInCents: z.number().int(),
        forecastInCents: z.number().int(),
        receivedInCents: z.number().int(),
        paidInCents: z.number().int(),
        payableInCents: z.number().int(),
        balanceInCents: z.number().int(),
        unknownPrices: z.number().int(),
        daily: z.array(daySchema),
    }),
});
const base = (shopId) => `/api/barbershops/${encodeURIComponent(shopId)}/finance`;
export const financeApi = {
    async period(shopId, month, signal, range, options) {
        var _a, _b;
        const result = periodSchema.parse(await httpClient.get(base(shopId), { params: { ...(range ? range : { month }), ...(options ? { view: options.view, ...(options.view === 'entries' ? { entriesPage: (_a = options.page) !== null && _a !== void 0 ? _a : 1, entriesLimit: 30 } : options.view === 'bookings' ? { bookingsPage: (_b = options.page) !== null && _b !== void 0 ? _b : 1, bookingsLimit: 30 } : {}) } : {}) }, signal }));
        if (range && (result.from !== range.from || result.to !== range.to))
            throw new Error('A API precisa ser atualizada para consultar este período.');
        return result;
    },
    async create(shopId, values) {
        return entrySchema.parse(await httpClient.post(base(shopId) + '/entries', values));
    },
    async update(shopId, entry, action, paidOn) {
        return entrySchema.parse(await httpClient.patch(base(shopId) + '/entries/' + encodeURIComponent(entry.id), {
            action,
            expectedVersion: entry.version,
            ...(paidOn ? { paidOn } : {}),
        }));
    },
    async copy(shopId, entryId, requestId) {
        return entrySchema.parse(await httpClient.post(base(shopId) + '/entries/' + encodeURIComponent(entryId) + '/copy', {
            requestId,
        }));
    },
    async receipt(shopId, bookingId, paidOn, requestId) {
        return entrySchema.parse(await httpClient.post(base(shopId) + '/receipts', { bookingId, paidOn, requestId }));
    },
};
