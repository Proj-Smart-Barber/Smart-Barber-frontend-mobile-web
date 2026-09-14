import { Staff } from '@/entities/staff';
import type { Barbershop } from '@/entities/barbershop';
import { NormalizedAuthError } from '../lib/normalize-auth-error';

export type AuthStatus =
  | 'bootstrapping'
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'error';

export interface SessionState {
  status: AuthStatus;
  staff: Staff | null;
  barbershop: Barbershop | null;
  token: string | null;
  error: NormalizedAuthError | null;
}
