import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InvitationResponseEngine,
  isInvitationExpired,
  processActivationState,
  type InvitationApiTransport,
} from '../model/invitation-response-engine';

describe('Task V3 — Ciclo de Resposta de Convites e Integridade de Identidade', () => {
  let mockTransport: InvitationApiTransport;
  let invalidateCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTransport = {
      getInvitation: vi.fn(),
      acceptById: vi.fn(),
      declineById: vi.fn(),
    };
    invalidateCallback = vi.fn().mockResolvedValue(undefined);
  });

  it('read_is_not_response: inspecionar detalhes não dispara aceite nem recusa', async () => {
    const fakeInvitation = {
      id: 'inv-123',
      barbershopId: 'shop-456',
      email: 'barber@example.com',
      role: 'BARBERMAN',
      status: 'PENDING' as const,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    vi.mocked(mockTransport.getInvitation).mockResolvedValue(fakeInvitation);

    const engine = new InvitationResponseEngine('inv-123', mockTransport, invalidateCallback);
    const detail = await engine.read();

    expect(detail.id).toBe('inv-123');
    expect(mockTransport.getInvitation).toHaveBeenCalledWith('inv-123');
    expect(mockTransport.acceptById).not.toHaveBeenCalled();
    expect(mockTransport.declineById).not.toHaveBeenCalled();
    expect(engine.status).toBe('idle');
    expect(engine.isAccepted).toBe(false);
  });

  it('accepted_but_refetch_failed_stays_accepted: 200 mantém accepted mesmo se queries posteriores falharem', async () => {
    vi.mocked(mockTransport.acceptById).mockResolvedValue({
      accepted: true,
      invitationId: 'inv-123',
      barbershopId: 'shop-456',
      status: 'ACCEPTED',
    });

    const failingInvalidate = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));
    const engine = new InvitationResponseEngine('inv-123', mockTransport, failingInvalidate);

    await engine.accept();

    expect(engine.status).toBe('committed');
    expect(engine.isAccepted).toBe(true);
    expect(engine.refetchFailed).toBe(true);
    expect(engine.isSubmitting).toBe(false);

    // Tentativa de segundo aceite deve ser prevenida
    await expect(engine.accept()).rejects.toThrow('A resposta a este convite já foi enviada');
    expect(mockTransport.acceptById).toHaveBeenCalledTimes(1);
  });

  it('wrong_account_keeps_context: erro de titular divergente preserva o invitationId original', async () => {
    vi.mocked(mockTransport.acceptById).mockRejectedValue(
      new Error('Destinatário do convite não confere com o usuário autenticado.')
    );

    const engine = new InvitationResponseEngine('inv-target-888', mockTransport, invalidateCallback);

    await expect(engine.accept()).rejects.toThrow('Destinatário do convite não confere');

    expect(engine.status).toBe('error');
    expect(engine.invitationIdValue).toBe('inv-target-888');
    expect(engine.errorMessage).toContain('Destinatário do convite não confere');
  });

  it('existing_account_activation_does_not_replace_password: conta pré-existente orienta login sem alterar senha', () => {
    const conflictResult = processActivationState('account_already_exists', 'account_already_exists');

    expect(conflictResult.canSetNewPassword).toBe(false);
    expect(conflictResult.requiresLogin).toBe(true);
    expect(conflictResult.instruction).toBe(
      'Entre na sua conta existente para continuar. Se precisar, recupere sua senha.'
    );
  });

  it('multiple_invitations_resume_exact_id: operações atuam no ID explicitamente selecionado', async () => {
    vi.mocked(mockTransport.acceptById).mockResolvedValue({
      accepted: true,
      invitationId: 'inv-specific-777',
      status: 'ACCEPTED',
    });

    const engine = new InvitationResponseEngine('inv-specific-777', mockTransport, invalidateCallback);
    await engine.accept();

    expect(mockTransport.acceptById).toHaveBeenCalledWith('inv-specific-777');
    expect(mockTransport.acceptById).not.toHaveBeenCalledWith('inv-first-001');
  });

  it('timeout ou erro de conexão transiciona para uncertain e permite checagem sem reenvio cego', async () => {
    vi.mocked(mockTransport.acceptById).mockRejectedValue({
      name: 'AbortError',
      message: 'A requisição excedeu o tempo limite (timeout).',
    });

    const engine = new InvitationResponseEngine('inv-uncertain-1', mockTransport, invalidateCallback);

    await expect(engine.accept()).rejects.toThrow();

    expect(engine.status).toBe('uncertain');
    expect(engine.errorMessage).toContain('A requisição não pôde ser confirmada a tempo');

    // Checagem de estado posterior
    vi.mocked(mockTransport.getInvitation).mockResolvedValue({
      id: 'inv-uncertain-1',
      barbershopId: 'shop-1',
      email: 'barber@example.com',
      role: 'BARBERMAN',
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const fresh = await engine.checkStatus();
    expect(fresh.status).toBe('ACCEPTED');
    expect(engine.status).toBe('committed');
    expect(engine.isAccepted).toBe(true);
  });

  it('isInvitationExpired deriva expiração da data sem inventar enum EXPIRED', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const future = new Date(Date.now() + 10000).toISOString();

    expect(isInvitationExpired(past)).toBe(true);
    expect(isInvitationExpired(future)).toBe(false);
  });
});
