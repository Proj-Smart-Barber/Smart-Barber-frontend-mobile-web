import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  session: {
    status: 'authenticated', identity: { id: 'user-A', name: 'Ana' },
    staff: { id: 'different-staff-id' }, selectedShopId: 'shop-A',
    memberships: [{ id: 'shop-A', role: 'BARBERMAN', state: 'ACTIVE' }], barbershop: { id: 'shop-A' },
  },
  env: { AVAILABILITY_SOURCE: 'mock' },
}));
vi.mock('@/features/auth', () => ({ useSession: () => state.session }));
vi.mock('@/shared/config/env', () => ({ ENV: state.env }));
vi.mock('@/shared/ui', () => ({ ErrorState: () => null }));
vi.mock('@/features/availability', () => ({ BarberScheduleScreen: () => null }));
import MyScheduleRoute from '@/app/(app)/my-schedule';
import { BarberScheduleScreen as RouteScreen } from '@/features/availability';
import { ErrorState } from '@/shared/ui';

describe('rota pessoal na sessão atual', () => {
  beforeEach(() => {
    state.session.status = 'authenticated';
    state.session.selectedShopId = 'shop-A';
    state.session.memberships = [{ id: 'shop-A', role: 'BARBERMAN', state: 'ACTIVE' }];
    state.session.barbershop = { id: 'shop-A' };
    state.env.AVAILABILITY_SOURCE = 'http';
  });
  it('usa users.id da identidade, nunca o id de staff', () => {
    const view = MyScheduleRoute();
    expect(view.type).toBe(RouteScreen);
    expect(view.props.barbermanId).toBe('user-A');
    expect(view.props.barbershopId).toBe('shop-A');
  });
  it('bloqueia sessão não autenticada', () => {
    state.session.status = 'unauthenticated';
    expect(MyScheduleRoute().type).toBe(ErrorState);
  });
  it('bloqueia seleção local sem vínculo na sessão', () => {
    state.session.memberships = [];
    expect(MyScheduleRoute().type).toBe(ErrorState);
  });
  it('bloqueia unidade selecionada diferente da carregada', () => {
    state.session.selectedShopId = 'shop-B';
    state.session.memberships = [{ id: 'shop-B', role: 'BARBERMAN', state: 'ACTIVE' }];
    expect(MyScheduleRoute().type).toBe(ErrorState);
  });
  it.each(['INACTIVE', 'PENDING', ''])('bloqueia vínculo sem estado ativo: %s', stateName => {
    state.session.memberships[0].state = stateName;
    expect(MyScheduleRoute().type).toBe(ErrorState);
  });
  it.each(['CLIENT', 'PLATFORM_ADMIN', 'unknown'])('bloqueia papel não operacional: %s', role => {
    state.session.memberships[0].role = role;
    expect(MyScheduleRoute().type).toBe(ErrorState);
  });
  it('preserva acesso do proprietário com vínculo operacional ativo à própria jornada', () => {
    state.session.memberships[0].role = 'OWNER';
    expect(MyScheduleRoute().type).toBe(RouteScreen);
  });
  it.each(['http', 'mock'])('abre a jornada autorizada em modo %s', source => {
    state.env.AVAILABILITY_SOURCE = source;
    const view = MyScheduleRoute();
    expect(view.type).toBe(RouteScreen);
    expect(view.props.barbermanId).toBe('user-A');
    expect(view.props.barbershopId).toBe('shop-A');
  });
});
