import { describe, it, expect } from 'vitest';
import { validateImageFile } from '../model/use-media-upload';
import { validateGoogleMapsUrl } from '../model/google-maps.validator';
import { MEDIA_LIMITS } from '../api/media.types';

describe('Media Upload Validation & Limits', () => {
  it('permite envio de imagem PNG com tamanho válido', () => {
    const result = validateImageFile(
      { size: 1024 * 1024, type: 'image/png', name: 'foto.png' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('permite envio de imagem JPEG com tamanho válido', () => {
    const result = validateImageFile(
      { size: 2 * 1024 * 1024, type: 'image/jpeg', name: 'foto.jpg' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(result.valid).toBe(true);
  });

  it('permite envio de imagem WebP com tamanho válido', () => {
    const result = validateImageFile(
      { size: 500 * 1024, type: 'image/webp', name: 'foto.webp' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(result.valid).toBe(true);
  });

  it('rejeita imagens que excedem o tamanho máximo (5 MB para avatar)', () => {
    const result = validateImageFile(
      { size: 6 * 1024 * 1024, type: 'image/png', name: 'foto-grande.png' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('tamanho máximo permitido');
  });

  it('permite imagem da galeria entre 5 MB e 10 MB (ex: 7 MB)', () => {
    const galleryResult = validateImageFile(
      { size: 7 * 1024 * 1024, type: 'image/jpeg', name: 'espaco-amplo.jpg' },
      MEDIA_LIMITS.MAX_SPACE_SIZE_BYTES,
    );
    expect(galleryResult.valid).toBe(true);
    expect(galleryResult.error).toBeUndefined();
  });

  it('rejeita imagem de avatar com o mesmo tamanho de 7 MB (excede 5 MB)', () => {
    const avatarResult = validateImageFile(
      { size: 7 * 1024 * 1024, type: 'image/jpeg', name: 'avatar-grande.jpg' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(avatarResult.valid).toBe(false);
    expect(avatarResult.error).toContain('tamanho máximo permitido de 5 MB');
  });

  it('rejeita imagens que excedem o tamanho máximo da galeria (10 MB)', () => {
    const result = validateImageFile(
      { size: 11 * 1024 * 1024, type: 'image/jpeg', name: 'foto-espaco.jpg' },
      MEDIA_LIMITS.MAX_SPACE_SIZE_BYTES,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('tamanho máximo permitido');
  });

  it('rejeita formato HEIC com mensagem amigável instruindo conversão prévia', () => {
    const result = validateImageFile(
      { size: 2 * 1024 * 1024, type: 'image/heic', name: 'IMG_0123.HEIC' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HEIC');
    expect(result.error).toContain('JPEG, PNG ou WebP');
  });

  it('rejeita arquivos SVG e HTML por segurança', () => {
    const svgResult = validateImageFile(
      { size: 1024, type: 'image/svg+xml', name: 'perfil.svg' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(svgResult.valid).toBe(false);
    expect(svgResult.error).toContain('Formato de arquivo não suportado');

    const htmlResult = validateImageFile(
      { size: 1024, type: 'text/html', name: 'foto.html' },
      MEDIA_LIMITS.MAX_AVATAR_SIZE_BYTES,
    );
    expect(htmlResult.valid).toBe(false);
  });
});

describe('Google Maps Profile URL Validation', () => {
  it('aceita URLs vazias ou nulas (campo estritamente opcional)', () => {
    expect(validateGoogleMapsUrl('').valid).toBe(true);
    expect(validateGoogleMapsUrl('   ').valid).toBe(true);
  });

  it('aceita links oficiais encurtados do Google Maps (maps.app.goo.gl)', () => {
    const result = validateGoogleMapsUrl('https://maps.app.goo.gl/abcdef12345');
    expect(result.valid).toBe(true);
  });

  it('aceita links oficiais do Google Maps web (google.com/maps ou maps.google.com)', () => {
    expect(validateGoogleMapsUrl('https://www.google.com/maps/place/Barbearia').valid).toBe(true);
    expect(validateGoogleMapsUrl('https://maps.google.com/?cid=123456789').valid).toBe(true);
  });

  it('rejeita protocolo inseguro HTTP', () => {
    const result = validateGoogleMapsUrl('http://maps.app.goo.gl/abcdef');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HTTPS');
  });

  it('rejeita domínios de terceiros ou links maliciosos', () => {
    const result = validateGoogleMapsUrl('https://malicious-site.com/maps');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('oficial do Google Maps');
  });
});
