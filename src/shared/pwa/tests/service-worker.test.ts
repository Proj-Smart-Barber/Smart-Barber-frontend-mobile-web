import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

function harness(extraPrecache: string[] = []) {
  const handlers: Record<string, any> = {};
  const stores = new Map<string, Map<string, Response>>();
  const cached = {
    keys: async () => [...stores.keys()],
    delete: async (key: string) => stores.delete(key),
    open: async (name: string) => {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      const key = (request: any) => (typeof request === 'string' ? request : request.url);
      return {
        match: async (request: any) => store.get(key(request))?.clone(),
        put: async (request: any, response: Response) => {
          store.set(key(request), response.clone());
        },
        keys: async () => [...store.keys()].map((url) => new Request(url)),
        delete: async (request: any) => store.delete(key(request)),
      };
    },
  };
  const fetch = vi.fn(async (_request?: Request) => {
    const decorate = (response: Response): Response => {
      const original = response.clone.bind(response);
      Object.defineProperty(response, 'type', { value: 'basic' });
      response.clone = () => decorate(original());
      return response;
    };
    return decorate(
      new Response('<html>Static public shell</html>', {
        headers: { 'content-type': 'text/html' },
      }),
    );
  });
  const skipWaiting = vi.fn(),
    claim = vi.fn();
  runInNewContext(
    readFileSync('public/sw.js', 'utf8').replace(
      "const PRECACHE_URLS = ['/index.html'];",
      `const PRECACHE_URLS = ${JSON.stringify(['/index.html', ...extraPrecache])};`,
    ),
    {
      self: {
        location: { origin: 'http://localhost' },
        clients: { claim },
        skipWaiting,
        addEventListener: (event: string, handler: any) => {
          handlers[event] = handler;
        },
      },
      caches: cached,
      fetch,
      URL,
      Request,
      Response,
      Headers,
      Date,
      Promise,
      Error,
    },
  );
  const dispatch = async (event: string, request?: any, data?: any) => {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers[event]({
      request,
      data,
      waitUntil: (value: Promise<unknown>) => waits.push(value),
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    const result = await response;
    await Promise.all(waits);
    return { result, intercepted: response !== undefined };
  };
  const request = (path: string, options: Record<string, unknown> = {}) => ({
    url: 'http://localhost' + path,
    method: 'GET',
    headers: new Headers(),
    mode: 'cors',
    ...options,
  });
  return { stores, fetch, skipWaiting, claim, dispatch, request };
}

describe('PWA cache boundaries', () => {
  it('installs only a credential-free static shell and waits before activating updates', async () => {
    const h = harness();
    await h.dispatch('install');
    expect(h.fetch.mock.calls[0][0]!.credentials).toBe('omit');
    expect(h.skipWaiting).not.toHaveBeenCalled();
    expect([...h.stores.values()].flatMap((store) => [...store.keys()])).toEqual([
      'http://localhost/index.html',
    ]);
  });
  it('never intercepts API, auth tokens, signed URLs, writes or authenticated assets', async () => {
    const h = harness();
    for (const request of [
      h.request('/api/bookings/me'),
      h.request('/api'),
      h.request('/assets/image.png?token=secret'),
      h.request('/verify-email'),
      h.request('/assets/image.png', { method: 'POST' }),
      h.request('/assets/image.png', { headers: new Headers({ authorization: 'Bearer test' }) }),
    ]) {
      expect((await h.dispatch('fetch', request)).intercepted).toBe(false);
    }
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.stores.size).toBe(0);
  });
  it('falls back to the static shell offline without storing private navigation HTML', async () => {
    const h = harness();
    await h.dispatch('install');
    await h.dispatch('fetch', h.request('/finance', { mode: 'navigate' }));
    expect([...h.stores.values()].flatMap((store) => [...store.keys()])).not.toContain(
      'http://localhost/finance',
    );
    h.fetch.mockRejectedValue(new Error('offline'));
    const { result } = await h.dispatch('fetch', h.request('/explore', { mode: 'navigate' }));
    expect(await result!.text()).toContain('Static public shell');
  });
  it('removes only caches owned by this application during activation and rollback', async () => {
    const h = harness();
    h.stores.set('other-application', new Map());
    h.stores.set('smartbarber-public-old-assets', new Map());
    await h.dispatch('activate');
    expect(h.stores.has('other-application')).toBe(true);
    expect(h.stores.has('smartbarber-public-old-assets')).toBe(false);
    await h.dispatch('install');
    await h.dispatch('message', undefined, { type: 'CLEAR_ALL_CACHES' });
    expect([...h.stores.keys()]).toEqual(['other-application']);
  });
  it('evicts runtime assets without deleting the startup bundle', async () => {
    const h = harness(['/_expo/static/core.js']);
    await h.dispatch('install');
    for (let i = 0; i < 90; i++)
      await h.dispatch('fetch', h.request('/assets/runtime-' + i + '.png'));
    const all = [...h.stores.values()].flatMap((store) => [...store.keys()]);
    expect(all).toContain('http://localhost/_expo/static/core.js');
    expect(all.filter((url) => url.includes('/assets/runtime-')).length).toBeLessThanOrEqual(79);
  });
});
