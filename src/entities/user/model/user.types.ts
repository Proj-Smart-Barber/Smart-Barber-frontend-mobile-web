export type AccountType = 'CLIENT' | 'BARBER' | 'OWNER' | 'PLATFORM_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  emailVerifiedAt: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  onboardingIntent?: string | null;
  credentialVersion?: number;
  createdAt?: string;
}

export interface AuthIdentity extends User {
  staff?: {
    id: string;
    role: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  } | null;
}

export interface Membership {
  id: string;
  name: string;
  role: string;
  status: string;
  timezone: string;
}
