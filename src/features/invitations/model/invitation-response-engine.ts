import type { InvitationDto, AcceptedDto, DeclinedDto } from '../api/invitations.dto';

export type ResponseStatus = 'idle' | 'sending' | 'committed' | 'uncertain' | 'error';
export type ResponseAction = 'ACCEPT' | 'DECLINE';

export interface InvitationApiTransport {
  getInvitation(invitationId: string): Promise<InvitationDto>;
  acceptById(invitationId: string): Promise<AcceptedDto>;
  declineById(invitationId: string): Promise<DeclinedDto>;
}

export interface InvalidationCallback {
  (): Promise<void>;
}

export interface InvitationResponseState {
  invitationId: string;
  status: ResponseStatus;
  lastAction: ResponseAction | null;
  errorMessage: string | null;
  refetchFailed: boolean;
}

export class InvitationResponseEngine {
  private state: InvitationResponseState;

  constructor(
    private readonly invitationId: string,
    private readonly transport: InvitationApiTransport,
    private readonly onInvalidate?: InvalidationCallback
  ) {
    if (!invitationId) {
      throw new Error('invitationId é obrigatório.');
    }
    this.state = {
      invitationId,
      status: 'idle',
      lastAction: null,
      errorMessage: null,
      refetchFailed: false,
    };
  }

  getState(): InvitationResponseState {
    return { ...this.state };
  }

  get invitationIdValue(): string {
    return this.state.invitationId;
  }

  get status(): ResponseStatus {
    return this.state.status;
  }

  get isSubmitting(): boolean {
    return this.state.status === 'sending';
  }

  get isAccepted(): boolean {
    return this.state.status === 'committed' && this.state.lastAction === 'ACCEPT';
  }

  get isDeclined(): boolean {
    return this.state.status === 'committed' && this.state.lastAction === 'DECLINE';
  }

  get errorMessage(): string | null {
    return this.state.errorMessage;
  }

  get refetchFailed(): boolean {
    return this.state.refetchFailed;
  }

  async read(): Promise<InvitationDto> {
    // Abrir ou ler detalhe NUNCA responde ao convite nem altera status para committed/accepted
    return this.transport.getInvitation(this.state.invitationId);
  }

  async accept(): Promise<AcceptedDto> {
    if (this.state.status === 'sending' || this.state.status === 'committed') {
      throw new Error('A resposta a este convite já foi enviada ou está em processamento.');
    }

    this.state.status = 'sending';
    this.state.errorMessage = null;

    try {
      const response = await this.transport.acceptById(this.state.invitationId);
      this.state.status = 'committed';
      this.state.lastAction = 'ACCEPT';
      this.state.errorMessage = null;

      if (this.onInvalidate) {
        try {
          await this.onInvalidate();
        } catch {
          // Falha ao reconsultar autoridade/perfil NÃO desfaz o status 'committed'
          this.state.refetchFailed = true;
        }
      }

      return response;
    } catch (err: any) {
      this.handleError(err);
      throw err;
    }
  }

  async decline(): Promise<DeclinedDto> {
    if (this.state.status === 'sending' || this.state.status === 'committed') {
      throw new Error('A resposta a este convite já foi enviada ou está em processamento.');
    }

    this.state.status = 'sending';
    this.state.errorMessage = null;

    try {
      const response = await this.transport.declineById(this.state.invitationId);
      this.state.status = 'committed';
      this.state.lastAction = 'DECLINE';
      this.state.errorMessage = null;

      if (this.onInvalidate) {
        try {
          await this.onInvalidate();
        } catch {
          this.state.refetchFailed = true;
        }
      }

      return response;
    } catch (err: any) {
      this.handleError(err);
      throw err;
    }
  }

  async checkStatus(): Promise<InvitationDto> {
    const fresh = await this.transport.getInvitation(this.state.invitationId);
    if (fresh.status === 'ACCEPTED') {
      this.state.status = 'committed';
      this.state.lastAction = 'ACCEPT';
      this.state.errorMessage = null;
    } else if (fresh.status === 'DECLINED') {
      this.state.status = 'committed';
      this.state.lastAction = 'DECLINE';
      this.state.errorMessage = null;
    } else {
      this.state.status = 'idle';
      this.state.errorMessage = null;
    }
    return fresh;
  }

  private handleError(err: any): void {
    const isNetworkOrTimeout =
      err?.name === 'AbortError' ||
      err?.isNetworkError === true ||
      err?.message?.includes('timeout') ||
      err?.message?.includes('conexão');

    if (isNetworkOrTimeout) {
      this.state.status = 'uncertain';
      this.state.errorMessage =
        'A requisição não pôde ser confirmada a tempo. Verifique a situação do convite antes de tentar novamente.';
    } else {
      this.state.status = 'error';
      this.state.errorMessage = err?.message || 'Falha ao processar o convite.';
    }
  }
}

export function isInvitationExpired(expiresAt: string, now: number = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

export function processActivationState(responseCode: string | number, message?: string) {
  if (responseCode === 'account_already_exists' || message?.includes('account_already_exists')) {
    return {
      canSetNewPassword: false,
      instruction: 'Entre na sua conta existente para continuar. Se precisar, recupere sua senha.',
      requiresLogin: true,
    };
  }

  return {
    canSetNewPassword: true,
    instruction: null,
    requiresLogin: false,
  };
}
