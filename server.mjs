import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';

const host = '127.0.0.1';
const port = Number(process.env.PORT ?? '4176');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT должен быть целым числом от 1 до 65535.');

const authority = `${host}:${port}`;
const origin = `http://${authority}`;
const bodyLimit = 64 * 1024;
const demoServices = new Set([1, 2, 3]);
const statuses = new Set(['open', 'closed']);
const seed = [
  { id: 101, title: 'Замена крана', status: 'open', serviceId: 1 },
  { id: 102, title: 'Уборка квартиры', status: 'closed', serviceId: 2 },
  { id: 103, title: 'Настройка роутера', status: 'open', serviceId: 1 },
  { id: 104, title: 'Уборка кухни', status: 'closed', serviceId: 2 },
];
let entries = structuredClone(seed);
let nextId = 105;

const types = new Map([
  ['html', 'text/html; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['txt', 'text/plain; charset=utf-8'],
  ['yml', 'application/yaml; charset=utf-8'],
  ['mjs', 'text/javascript; charset=utf-8'],
  ['js', 'text/javascript; charset=utf-8'],
  ['webmanifest', 'application/manifest+json; charset=utf-8'],
  ['png', 'image/png'],
  ['svg', 'image/svg+xml'],
  ['ico', 'image/x-icon'],
]);

class RequestError extends Error {
  constructor(status, code, field) {
    super(code);
    this.status = status;
    this.details = { code };
    if (field) this.details.field = field;
  }
}

function send(response, status, body, contentType, headers = {}, head = false) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(head ? undefined : body);
}

function json(response, status, value, headers = {}) {
  send(response, status, JSON.stringify(value), 'application/json; charset=utf-8', headers);
}

function allow(response, methods) {
  json(response, 405, { code: 'METHOD_NOT_ALLOWED' }, { Allow: methods });
}

function isLocalMutation(request, requireOrigin = false) {
  const source = request.headers.origin;
  const site = request.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return false;
  return source === origin || (!requireOrigin && source === undefined);
}

async function readJson(request) {
  const type = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (type !== 'application/json') throw new RequestError(415, 'JSON_REQUIRED');
  if (Number(request.headers['content-length']) > bodyLimit) throw new RequestError(413, 'BODY_TOO_LARGE');

  let size = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > bodyLimit) throw new RequestError(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }

  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError();
    return parsed;
  } catch {
    throw new RequestError(400, 'INVALID_JSON_OBJECT');
  }
}

async function serveRequests(request, response, url) {
  if (request.method === 'GET') {
    const status = url.searchParams.get('status');
    if (status !== null && !statuses.has(status)) throw new RequestError(400, 'INVALID_STATUS', 'status');
    const visible = status === null ? entries : entries.filter((item) => item.status === status);
    json(response, 200, visible);
    return;
  }
  if (request.method !== 'POST') {
    allow(response, 'GET, POST');
    return;
  }
  if (!isLocalMutation(request)) throw new RequestError(403, 'ORIGIN_FORBIDDEN');
  const { title, serviceId = 1, mode = 'correct' } = await readJson(request);
  if (mode !== 'correct' && mode !== 'defect') throw new RequestError(400, 'INVALID_MODE', 'mode');
  if (!demoServices.has(serviceId)) throw new RequestError(422, 'UNKNOWN_SERVICE', 'serviceId');
  if (typeof title !== 'string') throw new RequestError(422, 'TITLE_TYPE', 'title');
  const cleaned = title.trim();
  const length = mode === 'defect' ? title.length : cleaned.length;
  if (length < 4 || length > 24) throw new RequestError(422, 'TITLE_LENGTH', 'title');
  if (entries.length >= 200) throw new RequestError(409, 'WORKSHOP_FULL');

  const created = { id: nextId++, title: cleaned, status: 'open', serviceId };
  entries.push(created);
  json(response, 201, created);
}

async function serveStatus(request, response, id) {
  if (request.method !== 'PATCH') {
    allow(response, 'PATCH');
    return;
  }
  if (!isLocalMutation(request)) throw new RequestError(403, 'ORIGIN_FORBIDDEN');
  const { status } = await readJson(request);
  if (!statuses.has(status)) throw new RequestError(422, 'INVALID_STATUS', 'status');

  const entry = entries.find((item) => item.id === id);
  if (!entry) throw new RequestError(404, 'REQUEST_NOT_FOUND');
  entry.status = status;
  json(response, 200, entry);
}

async function resetWorkshop(request, response) {
  if (request.method !== 'POST') {
    allow(response, 'POST');
    return;
  }
  if (!isLocalMutation(request, true)) throw new RequestError(403, 'ORIGIN_FORBIDDEN');
  await readJson(request);
  entries = structuredClone(seed);
  nextId = 105;
  json(response, 200, entries);
}

async function serveFile(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    allow(response, 'GET, HEAD');
    return;
  }
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  const type = types.get(name.split('.').at(-1));
  if (!type || !/^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]+$/i.test(name)) throw new RequestError(404, 'NOT_FOUND');

  let file;
  try {
    file = await readFile(new URL(`./dist/${name}`, import.meta.url));
  } catch (error) {
    if (error.code === 'ENOENT') throw new RequestError(404, 'NOT_FOUND');
    throw error;
  }

  send(response, 200, file, type, {
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  }, request.method === 'HEAD');
}

const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (request, response) => {
  try {
    if (request.headers.host !== authority || !request.url?.startsWith('/')) throw new RequestError(400, 'INVALID_HOST_OR_PATH');
    const url = new URL(request.url, origin);
    if (url.origin !== origin) throw new RequestError(400, 'INVALID_HOST_OR_PATH');

    if (url.pathname === '/api/requests') {
      await serveRequests(request, response, url);
    } else if (url.pathname === '/api/requests/reset') {
      await resetWorkshop(request, response);
    } else {
      const itemPath = /^\/api\/requests\/(\d{1,8})$/.exec(url.pathname);
      if (itemPath) await serveStatus(request, response, Number(itemPath[1]));
      else await serveFile(request, response, url.pathname);
    }
  } catch (error) {
    request.resume();
    if (error instanceof RequestError) {
      const headers = error.status === 413 ? { Connection: 'close' } : {};
      json(response, error.status, error.details, headers);
    } else {
      console.error(error);
      json(response, 500, { code: 'SERVER_ERROR' });
    }
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Порт ${port} уже занят. Адрес практикума ${origin}/.` : error.message);
  process.exitCode = 1;
});

async function openBrowser(browserPath, profilePath) {
  const downloads = join(dirname(profilePath), 'Учебные-файлы');
  const settings = join(profilePath, 'Default');
  await Promise.all([mkdir(downloads, { recursive: true }), mkdir(settings, { recursive: true })]);
  const preferences = {
    download: { default_directory: downloads, directory_upgrade: true },
    savefile: { default_directory: downloads },
  };
  try {
    await writeFile(join(settings, 'Preferences'), JSON.stringify(preferences), { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const browser = spawn(browserPath, [
    '--user-data-dir=' + profilePath,
    '--disk-cache-dir=' + join(profilePath, 'cache'),
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    origin + '/',
  ], { detached: true, stdio: 'ignore', windowsHide: true });
  browser.on('error', () => console.error('Открой практикум вручную: ' + origin + '/'));
  browser.unref();
}

server.listen(port, host, () => {
  console.log(`Путь в IT\n${origin}/\nСтенд ${origin}/stand.html\nДля остановки нажми Ctrl+C.`);
  const browserPath = process.env.QA_WORKSHOP_BROWSER;
  const profilePath = process.env.QA_WORKSHOP_PROFILE;
  if (process.platform === 'win32' && process.argv.includes('--open') && browserPath && profilePath) {
    openBrowser(browserPath, profilePath).catch(error => {
      console.error('Не удалось открыть выделенный профиль. Адрес практикума ' + origin + '/');
      console.error(error.message);
    });
  }
});
