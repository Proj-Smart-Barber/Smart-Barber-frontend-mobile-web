import { Platform } from 'react-native';
import { httpClient } from '../../../shared/api';
export class MediaApi {
    /**
     * Solicita URL pré-assinada para upload direto:
     * POST /api/media/upload-intent
     */
    async initiateUpload(data, token) {
        return httpClient.post('/api/media/upload-intent', data, { token });
    }
    /**
     * Envia os bytes diretamente para o bucket via URL pré-assinada (sem passar pelo processo da API)
     */
    async uploadToPresignedUrl(uploadUrl, fileBlob, contentType, signal, onProgress) {
        if (onProgress) {
            await new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                const abort = () => request.abort();
                const cleanup = () => signal === null || signal === void 0 ? void 0 : signal.removeEventListener('abort', abort);
                request.open('PUT', uploadUrl);
                request.setRequestHeader('Content-Type', contentType);
                request.upload.onprogress = (event) => {
                    if (event.lengthComputable)
                        onProgress(event.loaded / event.total);
                };
                request.onload = () => {
                    cleanup();
                    if (request.status >= 200 && request.status < 300)
                        resolve();
                    else
                        reject(new Error(`Falha no upload: status ${request.status}`));
                };
                request.onerror = () => { cleanup(); reject(new Error('Falha de conexão ao enviar a imagem.')); };
                request.onabort = () => { cleanup(); reject(new Error('Envio cancelado.')); };
                if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                    reject(new Error('Envio cancelado.'));
                    return;
                }
                signal === null || signal === void 0 ? void 0 : signal.addEventListener('abort', abort, { once: true });
                request.send(fileBlob);
            });
            return;
        }
        const send = Platform.OS === 'web' ? fetch : (await import('expo/fetch')).fetch;
        const response = await send(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
            },
            body: fileBlob,
            signal,
        });
        if (!response.ok) {
            throw new Error(`Falha no upload direto para o armazenamento: status ${response.status}`);
        }
    }
    async uploadImage(intent, file, contentType, onProgress) {
        try {
            await this.uploadToPresignedUrl(intent.uploadUrl, file, contentType, undefined, onProgress);
        }
        catch (error) {
            // Libera a intenção que falhou sem substituir o erro original do envio.
            await httpClient.delete(`/api/media/${encodeURIComponent(intent.mediaId)}`).catch(() => undefined);
            throw error;
        }
        return this.confirmUpload(intent.mediaId);
    }
    async uploadMultipart(mediaId, file, type, signal, onProgress) {
        const route = `/api/media/${encodeURIComponent(mediaId)}/multipart`;
        const session = await httpClient.post(route, {}, { signal });
        if (session.complete) {
            onProgress === null || onProgress === void 0 ? void 0 : onProgress(1);
            return;
        }
        if (!Number.isSafeInteger(session.partSize) || session.partSize < 5 * 1024 * 1024 || session.partSize > 10 * 1024 * 1024)
            throw new Error('Sessão de envio inválida.');
        const count = Math.ceil(file.size / session.partSize);
        for (let part = 1; part <= count; part++) {
            if (signal === null || signal === void 0 ? void 0 : signal.aborted)
                throw new Error('Envio cancelado.');
            const begin = (part - 1) * session.partSize;
            const chunk = file.slice(begin, Math.min(begin + session.partSize, file.size), type);
            if (!session.parts.some(item => item.part === part && item.size === chunk.size)) {
                let sent = false;
                for (let attempt = 0; attempt < 3 && !sent; attempt++) {
                    try {
                        const signed = await httpClient.post(route + '/part', { part }, { signal });
                        await this.uploadToPresignedUrl(signed.uploadUrl, chunk, type, signal);
                        sent = true;
                    }
                    catch (error) {
                        if ((signal === null || signal === void 0 ? void 0 : signal.aborted) || attempt === 2)
                            throw error;
                        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                    }
                }
            }
            onProgress === null || onProgress === void 0 ? void 0 : onProgress(Math.min(part * session.partSize, file.size) / file.size);
        }
        await httpClient.post(route + '/complete', {}, { signal });
    }
    /**
     * Confirma o upload, processa e valida a integridade/metadados no backend:
     * POST /api/media/:mediaId/confirm
     */
    async confirmUpload(mediaId, token) {
        return httpClient.post(`/api/media/${encodeURIComponent(mediaId)}/confirm`, {}, { token });
    }
    /**
     * Atualiza avatar do usuário logado:
     * PATCH /api/users/me/avatar
     */
    async updateUserAvatar(mediaId, token) {
        return httpClient.patch('/api/users/me/avatar', { mediaId }, { token });
    }
    /**
     * Remove avatar do usuário logado:
     * DELETE /api/users/me/avatar
     */
    async removeUserAvatar(token) {
        return httpClient.delete('/api/users/me/avatar', { token });
    }
    /**
     * Atualiza logotipo da barbearia (apenas OWNER):
     * PATCH /api/barbershops/:shopId/logo
     */
    async updateBarbershopLogo(shopId, mediaId, token) {
        return httpClient.patch(`/api/barbershops/${encodeURIComponent(shopId)}/logo`, { mediaId }, { token });
    }
    /**
     * Remove logotipo da barbearia (apenas OWNER):
     * DELETE /api/barbershops/:shopId/logo
     */
    async removeBarbershopLogo(shopId, token) {
        return httpClient.delete(`/api/barbershops/${encodeURIComponent(shopId)}/logo`, {
            token,
        });
    }
    /**
     * Atualiza link do Google Maps da unidade:
     * PATCH /api/barbershops/:shopId/google-url
     */
    async updateBarbershopGoogleUrl(shopId, googleMapsUrl, token) {
        return httpClient.patch(`/api/barbershops/${encodeURIComponent(shopId)}/google-url`, { googleMapsUrl }, { token });
    }
    /**
     * Lista itens da galeria da unidade:
     * GET /api/barbershops/:shopId/gallery
     */
    async getBarbershopGallery(shopId, tokenOrOptions) {
        const options = typeof tokenOrOptions === 'object' && tokenOrOptions !== null
            ? tokenOrOptions
            : { token: tokenOrOptions };
        const res = await httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/gallery`, options);
        return res.items || [];
    }
    /**
     * Adiciona foto à galeria da unidade:
     * POST /api/barbershops/:shopId/gallery
     */
    async addGalleryPhoto(shopId, mediaId, caption, isCover, token) {
        return httpClient.post(`/api/barbershops/${encodeURIComponent(shopId)}/gallery`, { mediaId, caption, isCover }, { token });
    }
    /**
     * Remove foto da galeria da unidade:
     * DELETE /api/barbershops/:shopId/gallery/:galleryItemId
     */
    async removeGalleryPhoto(shopId, galleryItemId, token) {
        return httpClient.delete(`/api/barbershops/${encodeURIComponent(shopId)}/gallery/${encodeURIComponent(galleryItemId)}`, { token });
    }
    /**
     * Reordena itens da galeria:
     * PATCH /api/barbershops/:shopId/gallery/reorder
     */
    async reorderGallery(shopId, itemIds, token) {
        return httpClient.patch(`/api/barbershops/${encodeURIComponent(shopId)}/gallery/reorder`, { itemIds }, { token });
    }
    /**
     * Define foto de capa da barbearia:
     * PATCH /api/barbershops/:shopId/gallery/:galleryItemId/cover
     */
    async setGalleryCover(shopId, galleryItemId, token) {
        return httpClient.patch(`/api/barbershops/${encodeURIComponent(shopId)}/gallery/${encodeURIComponent(galleryItemId)}/cover`, {}, { token });
    }
}
export const mediaApi = new MediaApi();
