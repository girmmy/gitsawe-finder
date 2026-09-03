/**
 * Serve `dist/` the way the host will, headers included.
 *
 * `vite preview` serves the built files but none of the headers, and the
 * Content-Security-Policy is exactly the kind of thing that only ever breaks in
 * production: a missing directive shows up as an embed that silently does not
 * load, with nothing but a console line to say why. So this reads the real
 * policy out of public/_headers rather than keeping a second copy of it, and
 * the end-to-end tests run against this.
 *
 *   node scripts/serve-dist.mjs [port]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

if (!existsSync(dist)) {
  process.stderr.write('dist/ is missing — run `npm run build` first.\n');
  process.exit(1);
}

/**
 * The headers block that applies to every path. public/_headers is the
 * deployed file, so parsing it keeps this honest: if the policy there changes
 * and the app stops working, the tests fail here rather than after a deploy.
 */
function globalHeaders() {
  const text = readFileSync(join(root, 'public', '_headers'), 'utf8');
  const headers = {};
  let inGlobal = false;
  for (const line of text.split('\n')) {
    if (/^\S/.test(line)) { inGlobal = line.trim() === '/*'; continue; }
    const match = inGlobal && line.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (match) headers[match[1]] = match[2].trim();
  }
  return headers;
}

const HEADERS = globalHeaders();
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  // Keep a crafted path from climbing out of dist/.
  const target = join(dist, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  const file = (target === dist || target.startsWith(dist + sep)) && existsSync(target) && statSync(target).isFile()
    ? target
    // Hash routing means every unknown path is still the app shell.
    : join(dist, 'index.html');

  for (const [name, value] of Object.entries(HEADERS)) res.setHeader(name, value);
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
}).listen(port, () => {
  process.stdout.write(`dist/ on http://localhost:${port} with the deployed headers\n`);
});
