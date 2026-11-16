import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../auth';
import { ENV } from '../../../shared/config/env';
import { useBarbershopQuery, useWeeklyScheduleQuery, useScheduleScopeQuery, useExceptionsQuery, useSaveWeeklyScheduleMutation, useCreateExceptionMutation, useUpdateExceptionMutation, useRemoveExceptionMutation, } from '../api/availability.api';
import { normalizeAvailabilityError } from '../api/normalize-availability-error';
import { buildScheduleDayViews } from './availability.types';
export function useAvailabilityViewModel(sessionBarbershopId, barbermanId) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { signOut } = useSession();
    const barbershopId = ENV.AVAILABILITY_SOURCE === 'http'
        ? sessionBarbershopId !== null && sessionBarbershopId !== void 0 ? sessionBarbershopId : ''
        : ENV.BARBERSHOP_ID;
    const configurationError = ENV.AVAILABILITY_SOURCE === 'http' && !barbershopId
        ? 'Não foi possível identificar a barbearia vinculada ao usuário autenticado.'
        : null;
    const hasHttpConfiguration = configurationError === null;
    const barbershopQuery = useBarbershopQuery(barbershopId);
    // Escopo específico (geral ou individual)
    const scopedScheduleQuery = useWeeklyScheduleQuery(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    // Documento de escopo autoritativo para distinguir INHERIT vs CLOSED quando schedules é vazio
    const scopedScopeQuery = useScheduleScopeQuery(barbermanId ? barbershopId : '', barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    // Consulta da jornada geral como fallback de herança quando barbermanId está ativo
    const generalScheduleQuery = useWeeklyScheduleQuery(barbershopId, undefined);
    const exceptionsQuery = useExceptionsQuery(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    const saveScheduleMutation = useSaveWeeklyScheduleMutation(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    const createExceptionMutation = useCreateExceptionMutation(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    const updateExceptionMutation = useUpdateExceptionMutation(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    const removeExceptionMutation = useRemoveExceptionMutation(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : undefined);
    const [formError, setFormError] = useState(null);
    // Determinar se os dados atuais são herdados da jornada geral (nunca confundir CLOSED com INHERIT)
    const scopeState = (_a = scopedScopeQuery.data) === null || _a === void 0 ? void 0 : _a.state;
    const hasIndividualEntries = Boolean(barbermanId &&
        scopedScheduleQuery.data &&
        scopedScheduleQuery.data.length > 0);
    const isClosedScope = Boolean(barbermanId && scopeState === 'CLOSED');
    const isInherited = Boolean(barbermanId &&
        !isClosedScope &&
        (scopeState === 'INHERIT' ||
            (scopeState === undefined &&
                scopedScheduleQuery.data &&
                scopedScheduleQuery.data.length === 0)));
    // Montar as entradas da jornada considerando herança
    const effectiveEntries = useMemo(() => {
        var _a, _b, _c, _d;
        if (!barbermanId) {
            return (_a = scopedScheduleQuery.data) !== null && _a !== void 0 ? _a : [];
        }
        if (isClosedScope) {
            return [];
        }
        if (hasIndividualEntries) {
            return (_b = scopedScheduleQuery.data) !== null && _b !== void 0 ? _b : [];
        }
        if (isInherited) {
            // Herda horários da barbearia, marcando o barbermanId para o formulário
            return ((_c = generalScheduleQuery.data) !== null && _c !== void 0 ? _c : []).map((entry) => ({
                ...entry,
                barbermanId,
            }));
        }
        return (_d = scopedScheduleQuery.data) !== null && _d !== void 0 ? _d : [];
    }, [
        barbermanId,
        isClosedScope,
        hasIndividualEntries,
        isInherited,
        scopedScheduleQuery.data,
        generalScheduleQuery.data,
    ]);
    const scheduleDays = useMemo(() => buildScheduleDayViews(effectiveEntries), [effectiveEntries]);
    const isLoadingInitial = hasHttpConfiguration &&
        (barbershopQuery.isLoading ||
            scopedScheduleQuery.isLoading ||
            (Boolean(barbermanId) && generalScheduleQuery.isLoading) ||
            exceptionsQuery.isLoading);
    const isFatalError = !hasHttpConfiguration ||
        ((barbershopQuery.isError || scopedScheduleQuery.isError || exceptionsQuery.isError) &&
            !isLoadingInitial);
    const isSaving = saveScheduleMutation.isPending ||
        createExceptionMutation.isPending ||
        updateExceptionMutation.isPending ||
        removeExceptionMutation.isPending;
    const initialQueryError = (_d = (_c = (_b = barbershopQuery.error) !== null && _b !== void 0 ? _b : scopedScheduleQuery.error) !== null && _c !== void 0 ? _c : exceptionsQuery.error) !== null && _d !== void 0 ? _d : null;
    const normalizedInitialError = useMemo(() => (initialQueryError ? normalizeAvailabilityError(initialQueryError) : null), [initialQueryError]);
    const isSessionExpired = ((_e = normalizedInitialError === null || normalizedInitialError === void 0 ? void 0 : normalizedInitialError.isSessionExpired) !== null && _e !== void 0 ? _e : false) ||
        ((_f = formError === null || formError === void 0 ? void 0 : formError.isSessionExpired) !== null && _f !== void 0 ? _f : false);
    // Mesmo comportamento da Agenda: se o backend indicar token inválido/expirado
    // (401 ou payload do jsonwebtoken), encerra a sessão e deixa o route guard
    // redirecionar o usuário ao login.
    useEffect(() => {
        if (isSessionExpired) {
            void signOut();
        }
    }, [isSessionExpired, signOut]);
    const handleSaveSchedule = useCallback(async (entries) => {
        setFormError(null);
        try {
            const scopedEntries = entries.map((entry) => ({
                ...entry,
                barbermanId: barbermanId !== null && barbermanId !== void 0 ? barbermanId : null,
            }));
            await saveScheduleMutation.mutateAsync(scopedEntries);
            return true;
        }
        catch (error) {
            setFormError(normalizeAvailabilityError(error));
            return false;
        }
    }, [saveScheduleMutation, barbermanId]);
    const handleCreateException = useCallback(async (exception) => {
        var _a;
        setFormError(null);
        try {
            const scopedException = {
                ...exception,
                barbermanId: (_a = barbermanId !== null && barbermanId !== void 0 ? barbermanId : exception.barbermanId) !== null && _a !== void 0 ? _a : null,
            };
            await createExceptionMutation.mutateAsync(scopedException);
            return true;
        }
        catch (error) {
            setFormError(normalizeAvailabilityError(error));
            return false;
        }
    }, [createExceptionMutation, barbermanId]);
    const handleUpdateException = useCallback(async (exceptionId, exception) => {
        setFormError(null);
        try {
            await updateExceptionMutation.mutateAsync({ exceptionId, exception });
            return true;
        }
        catch (error) {
            setFormError(normalizeAvailabilityError(error));
            return false;
        }
    }, [updateExceptionMutation]);
    const handleRemoveException = useCallback(async (exceptionId) => {
        setFormError(null);
        try {
            await removeExceptionMutation.mutateAsync(exceptionId);
            return true;
        }
        catch (error) {
            setFormError(normalizeAvailabilityError(error));
            return false;
        }
    }, [removeExceptionMutation]);
    const clearFormError = useCallback(() => setFormError(null), []);
    const handleRetry = useCallback(() => {
        setFormError(null);
        void barbershopQuery.refetch();
        void scopedScheduleQuery.refetch();
        if (barbermanId) {
            void generalScheduleQuery.refetch();
        }
        void exceptionsQuery.refetch();
    }, [barbershopQuery, scopedScheduleQuery, generalScheduleQuery, exceptionsQuery, barbermanId]);
    return {
        barbershop: (_g = barbershopQuery.data) !== null && _g !== void 0 ? _g : null,
        scheduleDays,
        exceptions: (_h = exceptionsQuery.data) !== null && _h !== void 0 ? _h : [],
        barbermanId: barbermanId !== null && barbermanId !== void 0 ? barbermanId : null,
        isIndividual: Boolean(barbermanId),
        isInherited,
        isLoadingInitial,
        isSaving,
        isFatalError,
        configurationError,
        formError,
        clearFormError,
        handleRetry,
        handleSaveSchedule,
        handleCreateException,
        handleUpdateException,
        handleRemoveException,
    };
}
