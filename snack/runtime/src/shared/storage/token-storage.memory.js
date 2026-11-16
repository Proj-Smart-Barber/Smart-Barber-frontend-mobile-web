/**
 * Adaptador em memória para testes ou ambientes sem storage persistente
 */
export class MemoryTokenStorage {
    constructor() {
        this.memoryToken = null;
    }
    async get() {
        return this.memoryToken;
    }
    async set(token) {
        this.memoryToken = token;
    }
    async remove() {
        this.memoryToken = null;
    }
}
