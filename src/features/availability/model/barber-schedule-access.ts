import { getOperationalContext, type OperationalSessionSource } from '@/features/auth/model/operational-context';

/** Shared by route and menu: account labels alone never grant unit access. */
export function getBarberScheduleContext(
  session: OperationalSessionSource & { barbershop?: { id: string } | null },
) {
  const context = getOperationalContext(session);
  if (!context?.userId || session.barbershop?.id !== context.shopId) return null;
  return context;
}
