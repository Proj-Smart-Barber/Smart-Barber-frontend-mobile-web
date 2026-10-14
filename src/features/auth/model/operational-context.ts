import type { SessionSnapshot } from './session-engine';
import type { Membership } from '@/entities/user';

export interface OperationalContext {
  userId: string;
  shopId: string;
  role: 'OWNER' | 'BARBERMAN';
  timezone: string;
  unitStatus?: string;
}

export interface OperationalSessionSource {
  status: string;
  identity?: { id: string } | null;
  selectedShopId?: string | null;
  memberships?: Membership[];
  barbershop?: { timezone?: string; status?: string } | null;
}

export function getOperationalContext(snapshot: OperationalSessionSource | null | undefined): OperationalContext | null {
  if (!snapshot || snapshot.status !== 'authenticated' || !snapshot.identity) {
    return null;
  }

  const { selectedShopId, memberships, identity } = snapshot;
  if (!selectedShopId || !memberships || memberships.length === 0) {
    return null;
  }

  const currentMembership = memberships.find((m) => m.id === selectedShopId);
  if (!currentMembership) {
    return null;
  }

  // Vínculo inativo ou sem estado explícito não habilita operação (falha fechado).
  // A normalização active-only da API reside exclusivamente no adapter da API.
  if (currentMembership.state !== 'ACTIVE') {
    return null;
  }

  // Papel unitário deriva exclusivamente do vínculo da unidade selecionada.
  // Falha fechado caso o papel seja desconhecido.
  if (currentMembership.role !== 'OWNER' && currentMembership.role !== 'BARBERMAN') {
    return null;
  }

  return {
    userId: identity.id,
    shopId: currentMembership.id,
    role: currentMembership.role,
    timezone: currentMembership.timezone || 'America/Sao_Paulo',
    unitStatus: currentMembership.status,
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

  // Se tem intenção de criação de barbearia pendente (canônica OWNER ou legada SETUP_BARBERSHOP)
  const effectiveIntent = onboardingIntent || identity.onboardingIntent;
  if ((effectiveIntent === 'OWNER' || effectiveIntent === 'SETUP_BARBERSHOP') && memberships.length === 0) {
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

  // Se for BARBER sem unidade - migrado para recursos de conta para evitar loop de redirect
  if (identity.accountType === 'BARBER') {
    return '/(account)/invitations';
  }

  // CLIENT comum sem unidade
  return '/(client)';
}

export function resolveAccountDestination(
  target: string | null | undefined,
  options?: { hasUnit?: boolean },
): string {
  const fallback = '/(account)/notifications';
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  const trimmed = target.trim();
  // Sanitização contra URLs externas, protocolos e scheme relativo
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    !trimmed.startsWith('/')
  ) {
    return fallback;
  }

  // Normalização de caminhos legados de notificações
  if (trimmed === '/notifications' || trimmed === '/(app)/notifications') {
    return '/(account)/notifications';
  }
  if (trimmed.startsWith('/notifications/')) {
    return trimmed.replace('/notifications/', '/(account)/notifications/');
  }
  if (trimmed.startsWith('/(app)/notifications/')) {
    return trimmed.replace('/(app)/notifications/', '/(account)/notifications/');
  }

  // Normalização de caminhos legados de convites
  if (trimmed === '/invitations' || trimmed === '/(app)/invitations') {
    return '/(account)/invitations';
  }

  // Se for rota de conta canônica
  if (trimmed.startsWith('/(account)/')) {
    return trimmed;
  }

  // Se for destino operacional em (app)
  if (trimmed.startsWith('/(app)')) {
    // Se o usuário não possui unidade, bloqueia acesso operacional e cai para notificações de conta
    if (options?.hasUnit === false) {
      return fallback;
    }
    return trimmed;
  }

  // Destinos para client ou platform
  if (trimmed.startsWith('/(client)') || trimmed.startsWith('/(platform)')) {
    return trimmed;
  }

  return fallback;
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

