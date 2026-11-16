export class InvitationResponseEngine {
    constructor(invitationId, transport, onInvalidate) {
        this.invitationId = invitationId;
        this.transport = transport;
        this.onInvalidate = onInvalidate;
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
    getState() {
        return { ...this.state };
    }
    get invitationIdValue() {
        return this.state.invitationId;
    }
    get status() {
        return this.state.status;
    }
    get isSubmitting() {
        return this.state.status === 'sending';
    }
    get isAccepted() {
        return this.state.status === 'committed' && this.state.lastAction === 'ACCEPT';
    }
    get isDeclined() {
        return this.state.status === 'committed' && this.state.lastAction === 'DECLINE';
    }
    get errorMessage() {
        return this.state.errorMessage;
    }
    get refetchFailed() {
        return this.state.refetchFailed;
    }
    async read() {
        // Abrir ou ler detalhe NUNCA responde ao convite nem altera status para committed/accepted
        return this.transport.getInvitation(this.state.invitationId);
    }
    async accept() {
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
                }
                catch {
                    // Falha ao reconsultar autoridade/perfil NÃO desfaz o status 'committed'
                    this.state.refetchFailed = true;
                }
            }
            return response;
        }
        catch (err) {
            this.handleError(err);
            throw err;
        }
    }
    async decline() {
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
                }
                catch {
                    this.state.refetchFailed = true;
                }
            }
            return response;
        }
        catch (err) {
            this.handleError(err);
            throw err;
        }
    }
    async checkStatus() {
        const fresh = await this.transport.getInvitation(this.state.invitationId);
        if (fresh.status === 'ACCEPTED') {
            this.state.status = 'committed';
            this.state.lastAction = 'ACCEPT';
            this.state.errorMessage = null;
        }
        else if (fresh.status === 'DECLINED') {
            this.state.status = 'committed';
            this.state.lastAction = 'DECLINE';
            this.state.errorMessage = null;
        }
        else {
            this.state.status = 'idle';
            this.state.errorMessage = null;
        }
        return fresh;
    }
    handleError(err) {
        var _a, _b;
        const isNetworkOrTimeout = (err === null || err === void 0 ? void 0 : err.name) === 'AbortError' ||
            (err === null || err === void 0 ? void 0 : err.isNetworkError) === true ||
            ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes('timeout')) ||
            ((_b = err === null || err === void 0 ? void 0 : err.message) === null || _b === void 0 ? void 0 : _b.includes('conexão'));
        if (isNetworkOrTimeout) {
            this.state.status = 'uncertain';
            this.state.errorMessage =
                'A requisição não pôde ser confirmada a tempo. Verifique a situação do convite antes de tentar novamente.';
        }
        else {
            this.state.status = 'error';
            this.state.errorMessage = (err === null || err === void 0 ? void 0 : err.message) || 'Falha ao processar o convite.';
        }
    }
}
export function isInvitationExpired(expiresAt, now = Date.now()) {
    return new Date(expiresAt).getTime() <= now;
}
export function processActivationState(responseCode, message) {
    if (responseCode === 'account_already_exists' || (message === null || message === void 0 ? void 0 : message.includes('account_already_exists'))) {
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
