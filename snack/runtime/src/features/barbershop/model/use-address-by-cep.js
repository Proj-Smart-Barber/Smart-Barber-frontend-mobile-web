import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchViaCep } from '../api/viacep.api';
import { normalizeCep, isValidCep } from '../lib/cep';
export function useAddressByCep(options = {}) {
    const { onAddressResolved, debounceMs = 400 } = options;
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState(null);
    const [lastSearchedCep, setLastSearchedCep] = useState('');
    const currentRequestRef = useRef(0);
    const abortControllerRef = useRef(null);
    const debounceTimerRef = useRef(null);
    const cancelCurrentRequest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);
    const lookup = useCallback(async (rawCep, force = false) => {
        var _a;
        const cleanCep = normalizeCep(rawCep);
        if (!isValidCep(cleanCep)) {
            cancelCurrentRequest();
            setStatus('idle');
            setErrorMessage(null);
            return;
        }
        if (!force && cleanCep === lastSearchedCep && status === 'success') {
            return;
        }
        cancelCurrentRequest();
        const requestId = ++currentRequestRef.current;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setStatus('loading');
        setErrorMessage(null);
        const result = await fetchViaCep(cleanCep, { signal: controller.signal });
        if (requestId !== currentRequestRef.current) {
            return;
        }
        setLastSearchedCep(cleanCep);
        setStatus(result.status);
        setErrorMessage((_a = result.errorMessage) !== null && _a !== void 0 ? _a : null);
        if (result.status === 'success' && result.data) {
            onAddressResolved === null || onAddressResolved === void 0 ? void 0 : onAddressResolved(result.data);
        }
    }, [cancelCurrentRequest, lastSearchedCep, status, onAddressResolved]);
    const onCepChange = useCallback((val) => {
        const clean = normalizeCep(val);
        if (clean.length < 8) {
            cancelCurrentRequest();
            setStatus('idle');
            setErrorMessage(null);
            return;
        }
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            lookup(clean);
        }, debounceMs);
    }, [cancelCurrentRequest, debounceMs, lookup]);
    const retry = useCallback(() => {
        if (lastSearchedCep) {
            lookup(lastSearchedCep, true);
        }
    }, [lastSearchedCep, lookup]);
    useEffect(() => {
        return () => {
            cancelCurrentRequest();
        };
    }, [cancelCurrentRequest]);
    return {
        status,
        isLoading: status === 'loading',
        errorMessage,
        lookup,
        onCepChange,
        retry,
        reset: cancelCurrentRequest,
    };
}
