#!/usr/bin/env node
/**
 * 开发期 HTTP 宿主：浏览器 Vite 代理到本服务。
 * Electron 主进程直接 spawn SidecarProcess，不再走本 HTTP。
 */
import express from 'express';
import { SidecarProcess } from './sidecar-process.mjs';

const PORT = Number(process.env.SIDECAR_PORT || 8787);
const sidecar = new SidecarProcess();

const sseClients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}
sidecar.on('log', ({ level, message }) => {
  console.log(`[sidecar:${level}] ${message}`);
  broadcast('log', { level, message, ts: Date.now() });
});

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/status', async (_req, res) => {
  let pong = null;
  try {
    pong = await sidecar.request('ping', {}, 4000);
  } catch {
    /* offline */
  }
  res.json({ ok: true, pong, ...sidecar.snapshot() });
});

app.get('/api/platforms', async (_req, res) => {
  try {
    res.json({ ok: true, data: await sidecar.request('platforms', {}, 8000) });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

app.post('/api/parse', async (req, res) => {
  const { url, cookies, proxy } = req.body || {};
  if (!url || typeof url !== 'string') {
    res.status(400).json({ ok: false, error: '缺少 url 参数' });
    return;
  }
  try {
    const data = await sidecar.request('parse', { url, cookies: cookies || null, proxy: proxy || null });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('event: hello\ndata: {"online":true}\n\n');
  sseClients.add(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': hb\n\n');
    } catch {
      /* closed */
    }
  }, 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[sidecar-server] http://127.0.0.1:${PORT}  (/api/status /api/parse /api/platforms /api/events)`);
  sidecar.start();
});

function shutdown() {
  console.log('\n[sidecar-server] shutting down...');
  sidecar.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
