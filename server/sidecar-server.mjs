#!/usr/bin/env node
/**
 * StreamGet Sidecar Server（Node 宿主）
 * =====================================
 * 职责：
 *   1. spawn 并守护 Python 边车进程（sidecar/bridge.py），JSON Lines 通信；
 *   2. 对前端暴露 HTTP API + SSE 事件流（开发期供 Vite 代理，Electron 化后
 *      可整体移入主进程，HTTP 层替换为 ipcMain，协议不变）；
 *   3. 边车崩溃自动重启、请求超时与挂起请求清理。
 *
 * 端点：
 *   GET  /api/status     宿主与边车健康状态（含 ping 结果）
 *   GET  /api/platforms  边车支持的平台列表
 *   POST /api/parse      { url, cookies?, proxy? } -> 真实解析结果
 *   GET  /api/events     SSE：log 事件（后续弹幕项目复用该通道推送 danmaku 事件）
 */
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BRIDGE_PATH = path.join(ROOT, 'sidecar', 'bridge.py');
const PORT = Number(process.env.SIDECAR_PORT || 8787);
const REQUEST_TIMEOUT_MS = Number(process.env.SIDECAR_TIMEOUT_MS || 100_000);

function resolvePythonLaunch() {
  if (process.env.SIDECAR_PYTHON) {
    const parts = process.env.SIDECAR_PYTHON.split(/\s+/).filter(Boolean);
    return { cmd: parts[0], prefix: parts.slice(1), display: process.env.SIDECAR_PYTHON };
  }
  const tries =
    process.platform === 'win32'
      ? [
          { cmd: 'python', prefix: [] },
          { cmd: 'py', prefix: ['-3'] },
          { cmd: 'python3', prefix: [] },
        ]
      : [
          { cmd: 'python3', prefix: [] },
          { cmd: 'python', prefix: [] },
        ];
  for (const t of tries) {
    const probe = spawnSync(t.cmd, [...t.prefix, '-c', 'import sys'], {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    if (!probe.error && probe.status === 0) {
      return { cmd: t.cmd, prefix: t.prefix, display: [t.cmd, ...t.prefix].join(' ') };
    }
  }
  return { cmd: process.platform === 'win32' ? 'python' : 'python3', prefix: [], display: 'python' };
}

const PYTHON_LAUNCH = resolvePythonLaunch();

class SidecarProcess extends EventEmitter {
  constructor() {
    super();
    this.proc = null;
    this.pending = new Map(); // id -> {resolve, reject}
    this.seq = 0;
    this.buf = '';
    this.backoffMs = 1000;
    this.stopping = false;
    this.startedAt = null;
  }

  start() {
    if (this.proc || this.stopping) return;
    let proc;
    try {
      proc = spawn(PYTHON_LAUNCH.cmd, [...PYTHON_LAUNCH.prefix, BRIDGE_PATH], {
        cwd: ROOT,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      });
    } catch (err) {
      this.emit('log', { level: 'error', message: `无法启动 Python 进程: ${err.message}` });
      this.scheduleRestart();
      return;
    }
    this.proc = proc;
    this.startedAt = Date.now();

    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => this.consumeStdout(chunk));
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk) => {
      for (const line of String(chunk).split('\n')) {
        const t = line.trimEnd();
        if (t) this.emit('log', { level: 'debug', message: `[py] ${t}` });
      }
    });
    proc.on('error', (err) => {
      this.emit('log', { level: 'error', message: `Python 进程错误: ${err.message}（请确认已安装 Python 3.10+）` });
    });
    proc.on('exit', (code) => {
      this.proc = null;
      const err = new Error(`sidecar 进程已退出 (code=${code})`);
      for (const [, p] of this.pending) p.reject(err);
      this.pending.clear();
      if (!this.stopping) {
        this.emit('log', { level: 'warn', message: `sidecar 退出，${this.backoffMs}ms 后自动重启` });
        this.scheduleRestart();
      }
    });

    this.emit('log', {
      level: 'success',
      message: `Python 边车已启动: ${PYTHON_LAUNCH.display} ${path.relative(ROOT, BRIDGE_PATH)}`,
    });
  }

  scheduleRestart() {
    setTimeout(() => this.start(), this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 2, 10_000);
  }

  consumeStdout(chunk) {
    this.buf += chunk;
    let idx;
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).trim();
      this.buf = this.buf.slice(idx + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        this.emit('log', { level: 'warn', message: `[协议] 丢弃非 JSON 行: ${line.slice(0, 160)}` });
        continue;
      }
      if (msg.event === 'log') {
        this.emit('log', msg);
        continue;
      }
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.data);
      else p.reject(new Error(msg.error || 'sidecar 内部错误'));
    }
  }

  request(cmd, payload = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      if (!this.proc) this.start();
      if (!this.proc || !this.proc.stdin.writable) {
        reject(new Error('sidecar 未运行（Python 进程不可用）'));
        return;
      }
      const id = `r${++this.seq}`;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`请求超时: ${cmd}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      try {
        this.proc.stdin.write(JSON.stringify({ id, cmd, ...payload }) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  stop() {
    this.stopping = true;
    if (this.proc) {
      try { this.proc.stdin.write(JSON.stringify({ id: 'bye', cmd: 'shutdown' }) + '\n'); } catch {}
      try { this.proc.kill(); } catch {}
    }
  }
}

const sidecar = new SidecarProcess();

// ---------------- SSE 事件总线（日志现在用；弹幕事件将来走同一通道） ----------------
const sseClients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}
sidecar.on('log', ({ level, message }) => {
  console.log(`[sidecar:${level}] ${message}`);
  broadcast('log', { level, message, ts: Date.now() });
});

// ---------------- HTTP API ----------------
const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/status', async (_req, res) => {
  let pong = null;
  try { pong = await sidecar.request('ping', {}, 4000); } catch {}
  res.json({
    ok: true,
    running: !!sidecar.proc,
    pong,
    python: PYTHON_LAUNCH.display,
    bridge: path.relative(ROOT, BRIDGE_PATH),
    startedAt: sidecar.startedAt,
  });
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
    try { res.write(': hb\n\n'); } catch { /* closed */ }
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
