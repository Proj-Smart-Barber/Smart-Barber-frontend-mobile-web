import { z } from 'zod';
import { httpClient } from '@/shared/api';

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
export type FinancePeriod = z.infer<typeof periodSchema>;
export type FinanceEntry = z.infer<typeof entrySchema>;
export type FinanceBooking = z.infer<typeof bookingSchema>;
export type ExpenseCategory = 'FIXED' | 'VARIABLE' | 'BARBER_PAYOUT' | 'PAYROLL' | 'OTHER';
export interface ExpenseInput {
  requestId: string;
  category: ExpenseCategory;
  description: string;
  amountInCents: number;
  dueOn: string;
  payee: string;
}
const base = (shopId: string) => `/api/barbershops/${encodeURIComponent(shopId)}/finance`;
export const financeApi = {
  async period(
    shopId: string,
    month?: string,
    signal?: AbortSignal,
    range?: { from: string; to: string },
    options?: { view: 'summary' | 'entries' | 'bookings'; page?: number },
  ): Promise<FinancePeriod> {
    const result = periodSchema.parse(
      await httpClient.get(base(shopId), { params: { ...(range ? range : { month }), ...(options ? { view: options.view, ...(options.view === 'entries' ? { entriesPage: options.page ?? 1, entriesLimit: 30 } : options.view === 'bookings' ? { bookingsPage: options.page ?? 1, bookingsLimit: 30 } : {}) } : {}) }, signal }),
    );
    if (range && (result.from !== range.from || result.to !== range.to))
      throw new Error('A API precisa ser atualizada para consultar este período.');
    return result;
  },
  async create(shopId: string, values: ExpenseInput) {
    return entrySchema.parse(await httpClient.post(base(shopId) + '/entries', values));
  },
  async update(shopId: string, entry: FinanceEntry, action: 'PAY' | 'CANCEL', paidOn?: string) {
    return entrySchema.parse(
      await httpClient.patch(base(shopId) + '/entries/' + encodeURIComponent(entry.id), {
        action,
        expectedVersion: entry.version,
        ...(paidOn ? { paidOn } : {}),
      }),
    );
  },
  async copy(shopId: string, entryId: string, requestId: string) {
    return entrySchema.parse(
      await httpClient.post(base(shopId) + '/entries/' + encodeURIComponent(entryId) + '/copy', {
        requestId,
      }),
    );
  },
  async receipt(shopId: string, bookingId: string, paidOn: string, requestId: string) {
    return entrySchema.parse(
      await httpClient.post(base(shopId) + '/receipts', { bookingId, paidOn, requestId }),
    );
  },
};
