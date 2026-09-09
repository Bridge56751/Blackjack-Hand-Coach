/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_ROOT = path.resolve(__dirname, '..', 'static-build');
const TEMPLATE_PATH = path.resolve(__dirname, 'templates', 'landing-page.html');
const basePath = (process.env.BASE_PATH || '/').replace(/\/+$/, '');
function readManifest(platform) {
  const manifestPath = path.resolve(STATIC_ROOT, platform, 'manifest.json');
  return fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf-8') : null;
}

const MANIFESTS = Object.freeze({
  ios: readManifest('ios'),
  android: readManifest('android'),
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return typeof appJson.expo?.name === 'string'
      ? appJson.expo.name
      : 'App Landing Page';
  } catch {
    return 'App Landing Page';
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toScriptString(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

function serveManifest(platform, res) {
  const manifest = MANIFESTS[platform];

  if (!manifest) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  res.writeHead(200, {
    'content-type': 'application/json',
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
  });
  res.end(manifest);
}

function buildStaticFileIndex(directory, relativeDirectory = '') {
  const files = new Map();
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.resolve(directory, entry.name);

    if (entry.isDirectory()) {
      for (const [key, value] of buildStaticFileIndex(absolutePath, relativePath)) {
        files.set(key, value);
      }
    } else if (entry.isFile()) {
      files.set(`/${relativePath.split(path.sep).join('/')}`, absolutePath);
    }
  }

  return files;
}

const staticFiles = buildStaticFileIndex(STATIC_ROOT);

function getRequestHost(req) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    || req.headers.host;
  const host = rawHost?.split(',')[0].trim();
  return host && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) ? host : null;
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto === 'http' ? 'http' : 'https';
  const host = getRequestHost(req);
  if (!host) {
    res.writeHead(400);
    res.end('Invalid Host');
    return;
  }
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `exps://${host}${basePath}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_ATTRIBUTE_PLACEHOLDER/g, escapeHtml(expsUrl))
    .replace(/EXPS_URL_JSON_PLACEHOLDER/g, toScriptString(expsUrl))
    .replace(/APP_NAME_PLACEHOLDER/g, escapeHtml(appName));

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  const segments = decodedPath.split('/');
  if (
    decodedPath.includes('\\')
    || decodedPath.includes('\0')
    || segments.some(segment => segment === '.' || segment === '..')
  ) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const normalizedPath = `/${segments.filter(Boolean).join('/')}`;
  const filePath = staticFiles.get(normalizedPath);
  if (!filePath) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'content-type': contentType });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const appName = getAppName();

const server = http.createServer((req, res) => {
  const requestHost = getRequestHost(req);
  if (!requestHost) {
    res.writeHead(400);
    res.end('Invalid Host');
    return;
  }

  let url;
  try {
    url = new URL(req.url || '/', `http://${requestHost}`);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || '/';
  }

  if (pathname === '/' || pathname === '/manifest') {
    const platform = req.headers['expo-platform'];
    if (platform === 'ios' || platform === 'android') {
      return serveManifest(platform, res);
    }

    if (pathname === '/') {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  serveStaticFile(pathname, res);
});

server.on('clientError', (_error, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

const port = parseInt(process.env.PORT || '3000', 10);
server.listen(port, '0.0.0.0', () => {
  console.log(`Serving static Expo build on port ${port}`);
});
