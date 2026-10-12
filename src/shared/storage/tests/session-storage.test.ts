import { describe, it, expect, beforeEach } from 'vitest';
import { WebSessionStorage } from '../session-storage.web';

describe('WebSessionStorage', () => {
  let storage: WebSessionStorage;

  beforeEach(() => {
    storage = new WebSessionStorage();
  });

  it('deve salvar e ler sessão sem vazar segredos', async () => {
    await storage.save({
      accessToken: 'temp-token',
      refreshToken: 'secret-refresh-token',
      hasSession: true,
      accountTypeHint: 'BARBER',
      selectedShopId: 'shop-1',
    });

    const read = await storage.read();
    expect(read).not.toBeNull();
    // The cookie renews access after reload; neither credential belongs in JS storage.
    expect(read?.accessToken).toBeNull();
    // refreshToken MUST NOT be persisted in web JS storage
    expect(read?.refreshToken).toBeUndefined();
    expect(read?.accountTypeHint).toBe('BARBER');
    expect(read?.selectedShopId).toBe('shop-1');
  });

  it('deve marcar e checar logout pendente', async () => {
    expect(await storage.isLogoutPending()).toBe(false);

    await storage.markLogoutPending();
    expect(await storage.isLogoutPending()).toBe(true);

    const session = await storage.read();
    expect(session).toBeNull();

    await storage.clear();
    expect(await storage.isLogoutPending()).toBe(false);
  });
});
