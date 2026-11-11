import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api';
import { MediaApi } from '../api/media.api';

vi.mock('@/shared/api', () => ({
  httpClient: { delete: vi.fn() },
}));

describe('Envio de imagens e liberação de vagas', () => {
  beforeEach(() => vi.resetAllMocks());

  const intent = {
    mediaId: 'fixture-id',
    uploadUrl: 'https://storage.example.test/fixture',
    publicUrl: 'https://media.example.test/fixture',
    objectKey: 'staging/fixture',
  };

  it('informa os bytes enviados antes de concluir o upload', async () => {
    const progress = vi.fn();
    class UploadRequest {
      status = 200;
      upload = { onprogress: (_event: { lengthComputable: boolean; loaded: number; total: number }) => {} };
      onload = () => {};
      open() {}
      setRequestHeader() {}
      send() {
        this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
        this.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
        this.onload();
      }
    }
    vi.stubGlobal('XMLHttpRequest', UploadRequest);
    try {
      await new MediaApi().uploadToPresignedUrl(intent.uploadUrl, new Blob(['fixture']), 'image/png', undefined, progress);
      expect(progress.mock.calls).toEqual([[0.5], [1]]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('cancela a intenção quando o PUT falha e preserva o erro original', async () => {
    const api = new MediaApi();
    const failure = new TypeError('Failed to fetch');
    vi.spyOn(api, 'uploadToPresignedUrl').mockRejectedValue(failure);
    const confirm = vi.spyOn(api, 'confirmUpload');
    vi.mocked(httpClient.delete).mockResolvedValue(undefined);

    await expect(api.uploadImage(intent, new Blob(['fixture']), 'image/png')).rejects.toBe(failure);
    expect(httpClient.delete).toHaveBeenCalledExactlyOnceWith('/api/media/fixture-id');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('preserva o erro de envio quando a tentativa de cancelamento também falha', async () => {
    const api = new MediaApi();
    const failure = new TypeError('Failed to fetch');
    vi.spyOn(api, 'uploadToPresignedUrl').mockRejectedValue(failure);
    vi.mocked(httpClient.delete).mockRejectedValue(new Error('offline'));

    await expect(api.uploadImage(intent, new Blob(['fixture']), 'image/png')).rejects.toBe(failure);
  });

  it('não cancela a imagem se a confirmação falhar após o envio', async () => {
    const api = new MediaApi();
    vi.spyOn(api, 'uploadToPresignedUrl').mockResolvedValue();
    vi.spyOn(api, 'confirmUpload').mockRejectedValue(new Error('resposta de confirmação perdida'));

    await expect(api.uploadImage(intent, new Blob(['fixture']), 'image/png')).rejects.toThrow('confirmação perdida');
    expect(httpClient.delete).not.toHaveBeenCalled();
  });
});
