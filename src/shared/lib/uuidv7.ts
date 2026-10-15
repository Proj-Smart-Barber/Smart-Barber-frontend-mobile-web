import {
  generateUuidV7 as canonicalGenerateUuidV7,
  isValidUuidV7 as canonicalIsValidUuidV7,
} from '@/features/bookings/lib/attempt-id';
import { serverClock } from '@/features/bookings/lib/server-clock';

export function isValidUuidV7(id: string): boolean {
  return canonicalIsValidUuidV7(id);
}

export function generateUuidV7(timestampMs?: number): string {
  const resolvedTime =
    timestampMs ??
    (serverClock.hasValidReference()
      ? serverClock.getRequiredNow()
      : Date.now());

  return canonicalGenerateUuidV7(resolvedTime);
}
