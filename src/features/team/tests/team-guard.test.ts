import { describe, expect, it } from 'vitest';
import type { Membership } from '@/entities/user';

function canManageTeam(selectedShopId: string | null, memberships: Membership[]): boolean {
  if (!selectedShopId) return false;
  return memberships.some(
    (m) =>
      m.id === selectedShopId &&
      m.state === 'ACTIVE' &&
      m.role === 'OWNER',
  );
}

describe('Team Access Guard', () => {
  const shopA = 'shop-alpha';
  const shopB = 'shop-beta';

  it('permite acesso quando o usuário é OWNER ACTIVE na unidade selecionada', () => {
    const memberships: Membership[] = [
      { id: shopA, name: 'Barbearia Alpha', role: 'OWNER', status: 'ACTIVE', state: 'ACTIVE', timezone: 'UTC' },
    ];

    expect(canManageTeam(shopA, memberships)).toBe(true);
  });

  it('nega acesso quando o usuário é OWNER ACTIVE em outra unidade mas não na selecionada', () => {
    const memberships: Membership[] = [
      { id: shopA, name: 'Barbearia Alpha', role: 'OWNER', status: 'ACTIVE', state: 'ACTIVE', timezone: 'UTC' },
      { id: shopB, name: 'Barbearia Beta', role: 'BARBERMAN', status: 'ACTIVE', state: 'ACTIVE', timezone: 'UTC' },
    ];

    expect(canManageTeam(shopB, memberships)).toBe(false);
  });

  it('nega acesso quando o papel na unidade selecionada é CLIENT ou BARBERMAN', () => {
    const memberships: Membership[] = [
      { id: shopA, name: 'Barbearia Alpha', role: 'BARBERMAN', status: 'ACTIVE', state: 'ACTIVE', timezone: 'UTC' },
    ];

    expect(canManageTeam(shopA, memberships)).toBe(false);
  });

  it('nega acesso quando o status do OWNER não é ACTIVE', () => {
    const memberships: Membership[] = [
      { id: shopA, name: 'Barbearia Alpha', role: 'OWNER', status: 'INACTIVE', state: 'INACTIVE', timezone: 'UTC' },
    ];

    expect(canManageTeam(shopA, memberships)).toBe(false);
  });

  it('nega acesso quando não há unidade selecionada', () => {
    const memberships: Membership[] = [
      { id: shopA, name: 'Barbearia Alpha', role: 'OWNER', status: 'ACTIVE', state: 'ACTIVE', timezone: 'UTC' },
    ];

    expect(canManageTeam(null, memberships)).toBe(false);
  });
});
