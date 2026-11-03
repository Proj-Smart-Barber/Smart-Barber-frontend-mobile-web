import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchViaCep, ViaCepAddress, ViaCepLookupStatus } from '../api/viacep.api';
import { normalizeCep, isValidCep } from '../lib/cep';

export interface UseAddressByCepOptions {
  onAddressResolved?: (address: ViaCepAddress) => void;
  debounceMs?: number;
}

export function useAddressByCep(options: UseAddressByCepOptions = {}) {
  const { onAddressResolved, debounceMs = 400 } = options;

  const [status, setStatus] = useState<ViaCepLookupStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSearchedCep, setLastSearchedCep] = useState<string>('');

  const currentRequestRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

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

  const lookup = useCallback(
    async (rawCep: string, force = false) => {
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
      setErrorMessage(result.errorMessage ?? null);

      if (result.status === 'success' && result.data) {
        onAddressResolved?.(result.data);
      }
    },
    [cancelCurrentRequest, lastSearchedCep, status, onAddressResolved]
  );

  const onCepChange = useCallback(
    (val: string) => {
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
    },
    [cancelCurrentRequest, debounceMs, lookup]
  );

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
