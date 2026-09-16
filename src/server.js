import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { SyncPipeline } from './syncPipeline.js';
import { CONFIG } from './config.js';

const PORT = process.env.PORT || 3000;
const pipeline = new SyncPipeline();

// Khởi tạo pipeline
pipeline.initialize().catch(err => console.error('Error initializing pipeline:', err));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/catalogs' && req.method === 'GET') {
        return sendJson(res, 200, {
          quocTichCount: pipeline.catalogManager.quocTichList.length,
          tinhTpCount: pipeline.catalogManager.tinhTpList.length,
          lyDoCuTruCount: pipeline.catalogManager.lyDoCuTruList.length,
          loaiGiayToCount: pipeline.catalogManager.loaiGiayToList.length,
          noiCuTruCount: pipeline.catalogManager.noiCuTruList.length,
          catalogs: {
            quocTich: pipeline.catalogManager.quocTichList,
            tinhTp: pipeline.catalogManager.tinhTpList,
            lyDoCuTru: pipeline.catalogManager.lyDoCuTruList,
            loaiGiayTo: pipeline.catalogManager.loaiGiayToList,
            noiCuTru: pipeline.catalogManager.noiCuTruList,
          },
        });
      }

      if (pathname === '/api/token/status' && req.method === 'GET') {
        const tm = pipeline.tokenManager;
        const nowSec = Math.floor(Date.now() / 1000);
        return sendJson(res, 200, {
          hasToken: !!tm.accessToken,
          accessToken: tm.accessToken ? `${tm.accessToken.substring(0, 15)}...` : null,
          expiresAt: tm.expiresAt,
          expiresInSeconds: tm.expiresAt ? Math.max(0, tm.expiresAt - nowSec) : 0,
        });
      }

      if (pathname === '/api/token/login' && req.method === 'POST') {
        try {
          const token = await pipeline.tokenManager.login();
          return sendJson(res, 200, { success: true, token });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (pathname === '/api/token/refresh' && req.method === 'POST') {
        try {
          const token = await pipeline.tokenManager.refresh();
          return sendJson(res, 200, { success: true, token });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (pathname === '/api/token/revoke' && req.method === 'POST') {
        const success = await pipeline.tokenManager.revoke();
        return sendJson(res, 200, { success });
      }

      if (pathname === '/api/transform' && req.method === 'POST') {
        const { rows } = await readBody(req);
        if (!Array.isArray(rows)) {
          return sendJson(res, 400, { error: 'rows must be an array' });
        }
        const result = await pipeline.dataTransformer.transformBatch(rows);
        return sendJson(res, 200, result);
      }

      if (pathname === '/api/sheets/pull' && req.method === 'POST') {
        const { sheetId, apiKey } = await readBody(req);
        const targetId = sheetId || CONFIG.GOOGLE_SHEET_ID;
        const resData = await pipeline.googleSheetService.fetchSheetData(targetId, apiKey);
        return sendJson(res, resData.success ? 200 : 400, resData);
      }

      if (pathname === '/api/sheets/sync' && req.method === 'POST') {
        const { sheetId } = await readBody(req);
        const targetId = sheetId || CONFIG.GOOGLE_SHEET_ID;
        const resData = await pipeline.pullAndProcessGoogleSheet(targetId);
        return sendJson(res, resData.success ? 200 : 400, resData);
      }

      if (pathname === '/api/sync' && req.method === 'POST') {
        const { rows } = await readBody(req);
        if (!Array.isArray(rows)) {
          return sendJson(res, 400, { error: 'rows must be an array' });
        }
        const results = await pipeline.processRows(rows);
        return sendJson(res, 200, { results });
      }

      return sendJson(res, 404, { error: 'API route not found' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Static File Serving from `public`
  let filePath = path.join(process.cwd(), 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to public/index.html
        fs.readFile(path.join(process.cwd(), 'public', 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 [KBTT Dev Server] đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Môi trường API: ${CONFIG.BASE_URL}`);
  console.log(`✨ Bấm Ctrl+C để dừng server.\n`);
});

export { server, pipeline };
