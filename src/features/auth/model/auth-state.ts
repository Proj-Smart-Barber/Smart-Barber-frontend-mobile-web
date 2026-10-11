import { Staff } from '@/entities/staff';
import type { Barbershop } from '@/entities/barbershop';
import type { AuthIdentity, Membership, AccountType } from '@/entities/user';
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
  identity: AuthIdentity | null;
  accountType: AccountType | null;
  memberships: Membership[];
  selectedShopId: string | null;
  barbershop: Barbershop | null;
  isOwner: boolean;
  token: string | null;
  error: NormalizedAuthError | null;
}
