const CACHE_PREFIX = 'smartbarber-public-';
const BUILD_VERSION = '__PWA_BUILD_VERSION__';
const STATIC_CACHE_NAME = `${CACHE_PREFIX}${BUILD_VERSION}-assets`;
const SHELL_CACHE_NAME = `${CACHE_PREFIX}${BUILD_VERSION}-shell`;
const PRECACHE_URLS = ['/index.html']; // Replaced with hashed startup assets by the export step.
const MAX_ASSET_BYTES = 6 * 1024 * 1024;
const MAX_CACHE_BYTES = 20 * 1024 * 1024;
const MAX_ENTRIES = 80;
const SHELL_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
let writes = Promise.resolve();

function isImmutableStaticAsset(pathname) {
  return pathname.startsWith('/_expo/static/') || pathname.startsWith('/assets/') ||
    ['/icon-192.png','/icon-512.png','/favicon.ico','/apple-touch-icon.png'].includes(pathname);
}

function isBypassedRequest(request, url) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return true;
  if (url.search || request.headers.get('authorization')) return true;
  if (/^\/(?:verify-email|reset-password|invitation|activate-barber)(?:\/|$)/.test(url.pathname)) return true;
  return false;
}

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)));
}

async function putBounded(name, request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic' ||
    /no-store|private/i.test(response.headers.get('cache-control') || '')) return;
  const bytes = (await response.clone().blob()).size;
  if (bytes > MAX_ASSET_BYTES) return;
  writes = writes.catch(() => {}).then(async () => {
    const cache = await caches.open(name);
    const headers = new Headers(response.headers);
    headers.set('x-smartbarber-cache-size', String(bytes));
    headers.set('x-smartbarber-cached-at', String(Date.now()));
    await cache.delete(request);
    await cache.put(request, new Response(response.clone().body, {status: response.status, headers}));
    const keys = await cache.keys();
    let total = 0;
    for (const key of keys) total += Number((await cache.match(key))?.headers.get('x-smartbarber-cache-size') || MAX_ASSET_BYTES);
    while (keys.length > MAX_ENTRIES || total > MAX_CACHE_BYTES) {
      const removable=keys.findIndex(key => !PRECACHE_URLS.some(path => new URL(path,self.location.origin).href === key.url));
      if (removable < 0) break;
      const [key] = keys.splice(removable,1);
      const old = await cache.match(key);
      total -= Number(old?.headers.get('x-smartbarber-cache-size') || MAX_ASSET_BYTES);
      await cache.delete(key);
    }
  });
  await writes;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Installation must finish before an update can replace the current offline shell.
    for (const path of PRECACHE_URLS) {
      const request = new Request(new URL(path,self.location.origin), {credentials: 'omit', cache: 'reload'});
      const response = await fetch(request);
      if (!response.ok) throw new Error('Public shell download failed');
      await putBounded(path === '/index.html' ? SHELL_CACHE_NAME : STATIC_CACHE_NAME, request, response);
    }
  })());
  // Updates wait for existing tabs to close; never discard a running booking draft.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE_NAME && key !== SHELL_CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'CACHE_PUBLIC_ASSETS' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      for (const value of event.data.urls.slice(0,40)) {
        try {
          const url=new URL(value,self.location.origin);
          if (url.origin !== self.location.origin || url.search || !isImmutableStaticAsset(url.pathname)) continue;
          const request=new Request(url,{credentials:'omit'});
          const response=await fetch(request);
          await putBounded(STATIC_CACHE_NAME,request,response);
        } catch { /* Cache warm-up must not affect the foreground application. */ }
      }
    })());
  }
  if (type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (type === 'CLEAR_ALL_CACHES') event.waitUntil(writes.catch(() => {}).then(clearAllCaches));
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (isBypassedRequest(request,url)) return;
  if (isImmutableStaticAsset(url.pathname)) {
    event.respondWith((async () => {
      const cached = await (await caches.open(STATIC_CACHE_NAME)).match(request);
      if (cached) return cached;
      const response = await fetch(request);
      event.waitUntil(putBounded(STATIC_CACHE_NAME,request,response.clone()).catch(() => {}));
      return response;
    })());
  } else if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch (error) {
        // Only the credential-free static export is a navigation fallback. No route HTML is saved.
        const shell = await (await caches.open(SHELL_CACHE_NAME)).match(new URL('/index.html',self.location.origin).href);
        const age = Date.now()-Number(shell?.headers.get('x-smartbarber-cached-at') || 0);
        if (shell && age <= SHELL_MAX_AGE) return shell;
        throw error;
      }
    })());
  }
});
