/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: httpsProxy.js
 * 
 * DESCRIPTION:
 * Production HTTPS Reverse Proxy for Shivneri Classic Apartment Management App.
 * 
 * ARCHITECTURE:
 * 1. Terminates TLS (HTTPS) on port 5443 (or configured HTTPS_PORT) using
 *    OpenSSL-generated certificates (server/certs/cert.pem and key.pem).
 * 2. Proxies all API requests ('/api/*') to backend Express server on http://127.0.0.1:5000.
 * 3. Enforces X-Forwarded-Proto: https, enabling secure cookies in Express.
 * 4. Serves production frontend assets from 'client/dist' with SPA fallback to index.html.
 * 5. Injects security headers (HSTS, nosniff, SAMEORIGIN).
 * ==============================================================================
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const CERT_DIR = path.resolve(__dirname, '../certs');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CLIENT_DIST = path.resolve(ROOT_DIR, 'client/dist');

const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '5443', 10);
const BACKEND_PORT = parseInt(process.env.PORT || '5000', 10);
const BACKEND_HOST = '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error loading asset');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    res.end(content);
  });
}

export function createHttpsReverseProxy() {
  if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
    throw new Error(`TLS Certificates missing in ${CERT_DIR}. Run generateCerts before starting proxy.`);
  }

  const tlsOptions = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH)
  };

  const server = https.createServer(tlsOptions, (req, res) => {
    // Add Security Headers
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Route 1: API requests forwarded to Express backend
    if (pathname.startsWith('/api/') || pathname === '/api') {
      const proxyHeaders = { ...req.headers };
      proxyHeaders['host'] = `${BACKEND_HOST}:${BACKEND_PORT}`;
      proxyHeaders['x-forwarded-proto'] = 'https';
      proxyHeaders['x-forwarded-for'] = req.socket.remoteAddress || '127.0.0.1';
      proxyHeaders['x-forwarded-host'] = req.headers.host || `localhost:${HTTPS_PORT}`;

      const proxyReq = http.request(
        {
          host: BACKEND_HOST,
          port: BACKEND_PORT,
          path: req.url,
          method: req.method,
          headers: proxyHeaders
        },
        (proxyRes) => {
          // Pass status and headers from backend response
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error('HTTPS Proxy Backend Connection Error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'बॅकएंड सर्व्हरशी संपर्क होऊ शकला नाही. (502 Bad Gateway: Failed to reach backend API server)'
          }));
        }
      });

      req.pipe(proxyReq);
      return;
    }

    // Route 2: Static assets from client/dist with SPA routing fallback
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';

    const fullFilePath = path.join(CLIENT_DIST, safePath);

    fs.stat(fullFilePath, (err, stats) => {
      if (!err && stats.isFile()) {
        serveStaticFile(res, fullFilePath);
      } else {
        // Fallback to index.html for Single Page Application client routes
        const indexPath = path.join(CLIENT_DIST, 'index.html');
        fs.stat(indexPath, (indexErr, indexStats) => {
          if (!indexErr && indexStats.isFile()) {
            serveStaticFile(res, indexPath);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Shivneri Classic: Frontend assets not built. Run `npm run build` in client.');
          }
        });
      }
    });
  });

  return server;
}

// Direct Execution Support
if (process.argv[1] && process.argv[1].endsWith('httpsProxy.js')) {
  try {
    const server = createHttpsReverseProxy();
    server.listen(HTTPS_PORT, '127.0.0.1', () => {
      console.log('==============================================================================');
      console.log('🏛️  SHIVNERI CLASSIC APARTMENT – PRODUCTION HTTPS REVERSE PROXY');
      console.log(`🔒 HTTPS Reverse Proxy listening securely on: https://localhost:${HTTPS_PORT}`);
      console.log(`📡 Forwarding API ('/api/*') to backend:     http://${BACKEND_HOST}:${BACKEND_PORT}`);
      console.log(`🌐 Serving Client SPA assets from:         ${CLIENT_DIST}`);
      console.log('==============================================================================');
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received: Closing HTTPS Reverse Proxy');
      server.close(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received: Closing HTTPS Reverse Proxy');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('Failed to start HTTPS Reverse Proxy:', err.message);
    process.exit(1);
  }
}

