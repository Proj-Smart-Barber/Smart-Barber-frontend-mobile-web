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
  today: z.string(),
  timezone: z.string(),
  serverTime: z.string(),
  entries: z.array(entrySchema),
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
  async period(shopId: string, month?: string, signal?: AbortSignal): Promise<FinancePeriod> {
    return periodSchema.parse(await httpClient.get(base(shopId), { params: { month }, signal }));
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
