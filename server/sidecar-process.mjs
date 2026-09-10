/**
 * Python sidecar 进程宿主（stdio JSON Lines）。
 * 供 HTTP 开发服务器与 Electron 主进程共用。
 */
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(MODULE_DIR, '..');
const REQUEST_TIMEOUT_MS = Number(process.env.SIDECAR_TIMEOUT_MS || 100_000);

export function resolvePythonLaunch() {
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

export class SidecarProcess extends EventEmitter {
  constructor(options = {}) {
    super();
    this.root = options.root || DEFAULT_ROOT;
    this.bridgePath = options.bridgePath || path.join(this.root, 'sidecar', 'bridge.py');
    this.python = options.python || resolvePythonLaunch();
    this.timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
    this.proc = null;
    this.pending = new Map();
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
      proc = spawn(this.python.cmd, [...this.python.prefix, this.bridgePath], {
        cwd: this.root,
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
      this.emit('log', {
        level: 'error',
        message: `Python 进程错误: ${err.message}（请确认已安装 Python 3.10+）`,
      });
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
      message: `Python 边车已启动: ${this.python.display} ${path.relative(this.root, this.bridgePath)}`,
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
      if (msg.event === 'danmaku') {
        this.emit('danmaku', msg);
        continue;
      }
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.data);
      else p.reject(new Error(msg.error || 'sidecar 内部错误'));
    }
  }

  request(cmd, payload = {}, timeoutMs = this.timeoutMs) {
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
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
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
      try {
        this.proc.stdin.write(JSON.stringify({ id: 'bye', cmd: 'shutdown' }) + '\n');
      } catch {
        /* ignore */
      }
      try {
        this.proc.kill();
      } catch {
        /* ignore */
      }
    }
  }

  snapshot() {
    return {
      running: !!this.proc,
      python: this.python.display,
      bridge: path.relative(this.root, this.bridgePath),
      startedAt: this.startedAt,
    };
  }
}
