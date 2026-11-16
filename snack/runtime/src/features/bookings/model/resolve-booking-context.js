/**
 * resolveBookingContext: Valida contexto frontend de acesso e ações da reserva.
 * Garante consistência de escopo sem substituir a autoridade do RBAC no backend.
 */
export function resolveBookingContext(params) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    const { actorId, selectedMembership, booking, requestedScope } = params;
    // Escopo padrão é PERSONAL se não especificado
    const targetScope = requestedScope === 'UNIT' ? 'UNIT' : 'PERSONAL';
    if (!actorId) {
        return {
            isValid: false,
            resolvedScope: targetScope,
            canAccess: false,
            canReschedule: false,
            canCancel: false,
            canComplete: false,
            canMarkNoShow: false,
            isBarberSelfOnly: false,
            reason: 'Ator não autenticado.',
        };
    }
    // 1. Escopo Operacional da Unidade (UNIT)
    if (targetScope === 'UNIT') {
        const isInactive = !selectedMembership ||
            selectedMembership.status === 'INACTIVE' ||
            selectedMembership.state !== 'ACTIVE' ||
            !['OWNER', 'BARBER', 'BARBERMAN'].includes(selectedMembership.role);
        if (isInactive) {
            return {
                isValid: false,
                resolvedScope: 'UNIT',
                canAccess: false,
                canReschedule: false,
                canCancel: false,
                canComplete: false,
                canMarkNoShow: false,
                isBarberSelfOnly: false,
                reason: 'Vínculo operacional ativo com a unidade é obrigatório.',
            };
        }
        const membershipShopId = selectedMembership.shopId || selectedMembership.id;
        // Se a reserva foi fornecida, valida correspondência de unidade
        if (booking) {
            if (booking.barbershopId !== membershipShopId) {
                return {
                    isValid: false,
                    resolvedScope: 'UNIT',
                    canAccess: false,
                    canReschedule: false,
                    canCancel: false,
                    canComplete: false,
                    canMarkNoShow: false,
                    isBarberSelfOnly: false,
                    reason: 'Acesso negado: a reserva pertence a outra unidade.',
                };
            }
            // Se o usuário é BARBER, só tem acesso e pode gerenciar se for o barbeiro designado
            const isBarber = ['BARBER', 'BARBERMAN'].includes(selectedMembership.role);
            if (isBarber && booking.barbermanId !== actorId) {
                return {
                    isValid: false,
                    resolvedScope: 'UNIT',
                    canAccess: false,
                    canReschedule: false,
                    canCancel: false,
                    canComplete: false,
                    canMarkNoShow: false,
                    isBarberSelfOnly: true,
                    reason: 'Profissional só pode acessar e gerenciar agendamentos da sua própria agenda.',
                };
            }
            const canReschedule = (_c = (_b = (_a = booking.capabilities) === null || _a === void 0 ? void 0 : _a.reschedule) === null || _b === void 0 ? void 0 : _b.allowed) !== null && _c !== void 0 ? _c : false;
            const canCancel = (_f = (_e = (_d = booking.capabilities) === null || _d === void 0 ? void 0 : _d.cancel) === null || _e === void 0 ? void 0 : _e.allowed) !== null && _f !== void 0 ? _f : false;
            const canComplete = (_j = (_h = (_g = booking.capabilities) === null || _g === void 0 ? void 0 : _g.complete) === null || _h === void 0 ? void 0 : _h.allowed) !== null && _j !== void 0 ? _j : false;
            const canMarkNoShow = (_m = (_l = (_k = booking.capabilities) === null || _k === void 0 ? void 0 : _k.noShow) === null || _l === void 0 ? void 0 : _l.allowed) !== null && _m !== void 0 ? _m : false;
            return {
                isValid: true,
                resolvedScope: 'UNIT',
                canAccess: true,
                canReschedule,
                canCancel,
                canComplete,
                canMarkNoShow,
                isBarberSelfOnly: isBarber,
            };
        }
        // Sem reserva ainda (ex: criação de nova reserva operacional)
        return {
            isValid: true,
            resolvedScope: 'UNIT',
            canAccess: true,
            canReschedule: false,
            canCancel: false,
            canComplete: false,
            canMarkNoShow: false,
            isBarberSelfOnly: ['BARBER', 'BARBERMAN'].includes(selectedMembership.role),
        };
    }
    // 2. Escopo Pessoal do Consumidor (PERSONAL)
    if (booking) {
        // Escopo PERSONAL exige que o ator seja o beneficiário (consumidor)
        const isOwner = booking.customerId === actorId ||
            (booking.customer && booking.customer.id === actorId);
        if (!isOwner) {
            return {
                isValid: false,
                resolvedScope: 'PERSONAL',
                canAccess: false,
                canReschedule: false,
                canCancel: false,
                canComplete: false,
                canMarkNoShow: false,
                isBarberSelfOnly: false,
                reason: 'Acesso negado: a reserva pertence a outro cliente.',
            };
        }
        const canReschedule = (_q = (_p = (_o = booking.capabilities) === null || _o === void 0 ? void 0 : _o.reschedule) === null || _p === void 0 ? void 0 : _p.allowed) !== null && _q !== void 0 ? _q : false;
        const canCancel = (_t = (_s = (_r = booking.capabilities) === null || _r === void 0 ? void 0 : _r.cancel) === null || _s === void 0 ? void 0 : _s.allowed) !== null && _t !== void 0 ? _t : false;
        return {
            isValid: true,
            resolvedScope: 'PERSONAL',
            canAccess: true,
            canReschedule,
            canCancel,
            canComplete: false, // Cliente final não conclui fisicamente
            canMarkNoShow: false, // Cliente final não marca No-Show
            isBarberSelfOnly: false,
        };
    }
    return {
        isValid: true,
        resolvedScope: 'PERSONAL',
        canAccess: true,
        canReschedule: true,
        canCancel: true,
        canComplete: false,
        canMarkNoShow: false,
        isBarberSelfOnly: false,
    };
}
