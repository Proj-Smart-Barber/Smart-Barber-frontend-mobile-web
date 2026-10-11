import type { SessionSnapshot } from './session-engine';

export interface OperationalContext {
  userId: string;
  shopId: string;
  role: 'OWNER' | 'BARBERMAN';
  timezone: string;
}

export function getOperationalContext(snapshot: SessionSnapshot): OperationalContext | null {
  if (snapshot.status !== 'authenticated' || !snapshot.identity) {
    return null;
  }

  const { selectedShopId, memberships, identity } = snapshot;
  if (!selectedShopId || memberships.length === 0) {
    return null;
  }

  const currentMembership = memberships.find((m) => m.id === selectedShopId);
  if (!currentMembership) {
    return null;
  }

  // Papel unitário deriva exclusivamente do vínculo da unidade selecionada
  const role: 'OWNER' | 'BARBERMAN' =
    currentMembership.role === 'OWNER' ? 'OWNER' : 'BARBERMAN';

  return {
    userId: identity.id,
    shopId: currentMembership.id,
    role,
    timezone: currentMembership.timezone || 'America/Sao_Paulo',
  };
}

export function resolveEntryDestination(
  snapshot: SessionSnapshot,
  onboardingIntent?: string | null,
): string {
  if (snapshot.status !== 'authenticated' || !snapshot.identity) {
    return '/(auth)/login';
  }

  const { identity, memberships } = snapshot;

  // Se for Administrador de Plataforma
  if (identity.accountType === 'PLATFORM_ADMIN') {
    return '/(platform)';
  }

  // Se tem intenção de criação de barbearia pendente
  const effectiveIntent = onboardingIntent || identity.onboardingIntent;
  if (effectiveIntent === 'SETUP_BARBERSHOP' && memberships.length === 0) {
    return '/(app)/barbershop-setup';
  }

  // Se o usuário tem ao menos uma unidade vinculada
  if (memberships.length > 0) {
    return '/(app)';
  }

  // Usuário autenticado sem unidade:
  // Se for OWNER sem unidade ainda criada
  if (identity.accountType === 'OWNER') {
    return '/(app)/barbershop-setup';
  }

  // Se for BARBER sem unidade
  if (identity.accountType === 'BARBER') {
    return '/(app)/invitations';
  }

  // CLIENT comum sem unidade
  return '/(client)';
}

export function validateNewPassword(password: string): { isValid: boolean; error?: string } {
  // Contagem por Unicode code points (Array.from conta code points reais como emojis)
  const codePointsCount = Array.from(password).length;
  if (codePointsCount < 15) {
    return {
      isValid: false,
      error: 'A nova senha deve ter no mínimo 15 caracteres.',
    };
  }

  // Limite máximo de 72 bytes UTF-8 (compatibilidade com bcrypt)
  const utf8Bytes = new TextEncoder().encode(password).length;
  if (utf8Bytes > 72) {
    return {
      isValid: false,
      error: 'A nova senha deve ter no máximo 72 bytes UTF-8.',
    };
  }

  return { isValid: true };
}
