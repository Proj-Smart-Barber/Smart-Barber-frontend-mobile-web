import { Staff } from '@/entities/staff';
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
  token: string | null;
  error: NormalizedAuthError | null;
}
