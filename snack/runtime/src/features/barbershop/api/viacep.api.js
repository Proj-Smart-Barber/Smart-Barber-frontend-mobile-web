import { normalizeCep, isValidCep } from '../lib/cep';
const VIACEP_BASE_URL = 'https://viacep.com.br/ws';
const DEFAULT_TIMEOUT_MS = 6000;
// Cache em memória indexado por 8 dígitos para evitar requisições redundantes
const cepCache = new Map();
export function clearViaCepCache() {
    cepCache.clear();
}
/**
 * Consulta pública de endereço por CEP no ViaCEP.
 * Não reutiliza HttpClient autenticado nem envia cookies/tokens.
 */
export async function fetchViaCep(rawCep, options) {
    var _a, _b;
    const digits = normalizeCep(rawCep);
    if (!isValidCep(digits)) {
        return {
            status: 'invalid_format',
            errorMessage: 'CEP deve conter 8 dígitos numéricos.',
        };
    }
    // Verificar cache
    const cached = cepCache.get(digits);
    if (cached) {
        return cached;
    }
    const timeoutMs = (_a = options === null || options === void 0 ? void 0 : options.timeoutMs) !== null && _a !== void 0 ? _a : DEFAULT_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timer = setTimeout(() => {
        timeoutController.abort();
    }, timeoutMs);
    let combinedSignal = timeoutController.signal;
    if (options === null || options === void 0 ? void 0 : options.signal) {
        if (options.signal.aborted) {
            clearTimeout(timer);
            return {
                status: 'error',
                errorMessage: 'Requisição cancelada.',
            };
        }
        // Encadear abort do signal externo
        options.signal.addEventListener('abort', () => timeoutController.abort(), { once: true });
    }
    try {
        const url = `${VIACEP_BASE_URL}/${digits}/json/`;
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            headers: {
                Accept: 'application/json',
            },
            signal: combinedSignal,
        });
        clearTimeout(timer);
        if (response.status === 400) {
            const result = {
                status: 'invalid_format',
                errorMessage: 'CEP com formato inválido no provedor postal.',
            };
            cepCache.set(digits, result);
            return result;
        }
        if (!response.ok) {
            return {
                status: 'error',
                errorMessage: 'Serviço de CEP temporariamente indisponível. Preencha o endereço manualmente.',
            };
        }
        const payload = await response.json();
        if ((payload === null || payload === void 0 ? void 0 : payload.erro) === true || (payload === null || payload === void 0 ? void 0 : payload.erro) === 'true') {
            const result = {
                status: 'not_found',
                errorMessage: 'CEP não encontrado. Verifique o número ou preencha manualmente.',
            };
            cepCache.set(digits, result);
            return result;
        }
        const address = {
            cep: digits,
            street: typeof payload.logradouro === 'string' ? payload.logradouro.trim() : '',
            neighborhood: typeof payload.bairro === 'string' ? payload.bairro.trim() : '',
            city: typeof payload.localidade === 'string' ? payload.localidade.trim() : '',
            state: typeof payload.uf === 'string' ? payload.uf.trim().toUpperCase() : '',
            ibge: typeof payload.ibge === 'string' ? payload.ibge : undefined,
        };
        const result = {
            status: 'success',
            data: address,
        };
        cepCache.set(digits, result);
        return result;
    }
    catch (error) {
        clearTimeout(timer);
        if ((error === null || error === void 0 ? void 0 : error.name) === 'AbortError') {
            if ((_b = options === null || options === void 0 ? void 0 : options.signal) === null || _b === void 0 ? void 0 : _b.aborted) {
                return {
                    status: 'error',
                    errorMessage: 'Consulta cancelada.',
                };
            }
            return {
                status: 'error',
                errorMessage: 'Tempo limite esgotado ao consultar CEP. Preencha manualmente.',
            };
        }
        return {
            status: 'error',
            errorMessage: 'Falha de conexão com o serviço de CEP. Preencha manualmente.',
        };
    }
}
