import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.argv[2] || '.tmp/preview-dist');
const shop = '10000000-0000-4000-8000-000000000001';
const service = '10000000-0000-4000-8000-000000000002';
const port = Number(process.argv[3] || 8087);
const requests = [];
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = decodeURIComponent(url.pathname);
  requests.push({ path: pathname, method: req.method, at: Date.now() });
  if (requests.length > 200) requests.shift();
  const json = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  if (pathname === '/__local_test__/requests') return json(200, requests);
  if (pathname.startsWith('/api')) {
    if (req.method !== 'GET')
      return json(405, { error: 'Only read-only synthetic fixtures are enabled.' });
    if (pathname === `/api/barbershops/${shop}`)
      return json(200, {
        barbershop: {
          id: shop,
          name: 'Barbearia de teste local',
          timezone: 'America/Sao_Paulo',
          location: 'Local sintético',
          slug: 'fixture',
          status: 'ACTIVE',
          cnpj: '00000000000000',
          ownerId: '10000000-0000-4000-8000-000000000003',
          avatarUrl: null,
          coverUrl: null,
        },
      });
    if (pathname === `/api/barbershops/${shop}/services`)
      return json(200, {
        items: [
          {
            id: service,
            barbershopId: shop,
            title: 'Corte de teste local',
            description: 'Fixture sintética',
            priceInCents: 3500,
            durationInMinutes: 30,
            isActive: true,
            createdAt: '2026-11-11T10:00:00Z',
            updatedAt: '2026-11-11T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      });
    if (pathname.endsWith('/gallery')) return json(200, { items: [] });
    if (pathname.endsWith('/reviews'))
      return json(200, {
        reviews: [],
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        averageRating: null,
        reviewCount: 0,
      });
    return json(401, { error: 'No real API is available in this preview.' });
  }
  let target = path.resolve(root, '.' + pathname);
  if (target !== root && !target.startsWith(root + path.sep))
    return json(400, { error: 'Invalid path' });
  try {
    if (!(await fs.stat(target)).isFile()) target = path.join(root, 'index.html');
  } catch {
    target = path.join(root, 'index.html');
  }
  try {
    const body = await fs.readFile(target);
    res.writeHead(200, {
      'content-type': types[path.extname(target)] || 'application/octet-stream',
      'cache-control': pathname === '/sw.js' ? 'no-store' : 'no-cache',
    });
    res.end(body);
  } catch {
    json(404, { error: 'Build not found' });
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Isolated public PWA preview on http://127.0.0.1:${port}; no external API proxy.`),
);
