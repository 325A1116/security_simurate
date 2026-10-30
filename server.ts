import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API endpoint: Live URL Vulnerability & Security Header Scanner
  app.post('/api/scan-url', async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: '有効なURLを入力してください (例: https://example.com)',
      });
    }

    let parsedUrl: URL;
    try {
      let target = url.trim();
      if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`;
      }
      parsedUrl = new URL(target);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URLの形式が正しくありません。(例: https://example.com)',
      });
    }

    // SSRF Protection: Prevent accessing internal IP, loopback, or cloud metadata
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    ) {
      return res.status(403).json({
        success: false,
        error: 'ローカルアドレス・プライベートIPおよびメタデータアドレスへのスキャンは安全のため禁止されています。',
      });
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CyberShield-SecurityScanner/2.0; +https://cybershield.internal)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      // Extract all headers into normalized key-value object
      const headersObj: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        // preserve case-insensitive standard keys
        headersObj[key] = val;
      });

      // Special handling for set-cookie if multiple
      const setCookie = response.headers.get('set-cookie') || '';

      const isHttps = parsedUrl.protocol === 'https:';

      return res.json({
        success: true,
        targetUrl: parsedUrl.toString(),
        resolvedUrl: response.url,
        statusCode: response.status,
        statusText: response.statusText,
        isHttps,
        latencyMs,
        headers: headersObj,
        setCookie,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isAbort = err.name === 'AbortError';

      return res.status(502).json({
        success: false,
        error: isAbort
          ? 'リクエストがタイムアウトしました (8秒超過)。ホストが応答しないかアクセス制限されています。'
          : `対象ホストへの接続に失敗しました: ${err.message || 'DNS解決エラーまたは接続拒否'}`,
        latencyMs,
      });
    }
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware in dev or static serving in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CyberShield] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CyberShield] Failed to start server:', err);
  process.exit(1);
});
