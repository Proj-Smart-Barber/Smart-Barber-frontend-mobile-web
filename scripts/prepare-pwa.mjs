import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const destination = path.resolve(process.argv[2] || 'dist');
const html = await readFile(path.join(destination, 'index.html'), 'utf8');
const source = await readFile('public/sw.js', 'utf8');
const version = createHash('sha256').update(html).update(source).digest('hex').slice(0, 16);
const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((value) => value.startsWith('/_expo/static/') || value.startsWith('/assets/'));
await writeFile(
  path.join(destination, 'sw.js'),
  source
    .replace('__PWA_BUILD_VERSION__', version)
    .replace(
      "const PRECACHE_URLS = ['/index.html'];",
      `const PRECACHE_URLS = ${JSON.stringify(['/index.html', ...new Set(assets)])};`,
    ),
);
console.log(`PWA export prepared: ${assets.length} startup assets, version ${version}.`);
