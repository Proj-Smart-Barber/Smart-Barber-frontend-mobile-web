/**
 * Erros normalizados de transporte HTTP
 */
export class ApiError extends Error {
    constructor(message, status, data, isNetworkError = false) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        this.isNetworkError = isNetworkError;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
