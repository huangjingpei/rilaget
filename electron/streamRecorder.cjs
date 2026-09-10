// @ts-check
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * 真实直播流 / 点播流录制器
 * 支持：
 * 1. HTTP-FLV 直播流（长轮询分块传输，直接边下边写磁盘）
 * 2. 纯文件 MP4 / TS 等直链下载
 * 3. HLS (.m3u8) 直播或切片点播录制（自动轮询切片并追加写入）
 */
class StreamRecorderManager {
  /**
   * @param {() => import('electron').BrowserWindow | null} getWindow
   */
  constructor(getWindow) {
    this.getWindow = getWindow;
    /** @type {Map<string, ActiveRecording>} */
    this.recordings = new Map();
  }

  /**
   * 启动任务录制
   * @param {{ taskId: string; url: string; filePath: string; headers?: Record<string, string> }} param0
   */
  start({ taskId, url, filePath, headers = {} }) {
    // 若已有任务且处于运行中，先停止旧实例
    if (this.recordings.has(taskId)) {
      this.stop(taskId);
    }

    // 确保目标目录存在
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    } catch (e) {
      console.error(`[Recorder] 创建目录失败: ${filePath}`, e);
    }

    const recording = new ActiveRecording(taskId, url, filePath, headers, (event) => {
      this.notify(event);
    });

    this.recordings.set(taskId, recording);
    recording.start();
    return { ok: true };
  }

  /**
   * 暂停任务
   * @param {string} taskId
   */
  pause(taskId) {
    const rec = this.recordings.get(taskId);
    if (rec) {
      rec.pause();
      return { ok: true };
    }
    return { ok: false, error: '任务不存在' };
  }

  /**
   * 停止并完成任务
   * @param {string} taskId
   */
  stop(taskId) {
    const rec = this.recordings.get(taskId);
    if (rec) {
      rec.stop();
      this.recordings.delete(taskId);
      return { ok: true };
    }
    return { ok: false, error: '任务不存在' };
  }

  /**
   * 发送进度或状态变更事件给渲染进程
   */
  notify(payload) {
    const win = this.getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('stream:progress', payload);
    }
  }

  /**
   * 退出应用时清理所有活跃录制
   */
  destroy() {
    for (const [taskId] of this.recordings) {
      this.stop(taskId);
    }
  }
}

class ActiveRecording {
  /**
   * @param {string} taskId
   * @param {string} url
   * @param {string} filePath
   * @param {Record<string, string>} headers
   * @param {(data: any) => void} onEvent
   */
  constructor(taskId, url, filePath, headers, onEvent) {
    this.taskId = taskId;
    this.url = url;
    this.filePath = filePath;
    this.headers = headers;
    this.onEvent = onEvent;

    this.status = 'idle'; // 'recording' | 'downloading' | 'completed' | 'paused' | 'failed'
    this.downloadedBytes = 0;
    this.totalBytes = 0;
    this.speedBytesPerSec = 0;
    this.elapsedSeconds = 0;

    /** @type {fs.WriteStream | null} */
    this.writeStream = null;
    /** @type {import('http').ClientRequest | null} */
    this.currentReq = null;
    /** @type {any} */
    this.speedTimer = null;
    /** @type {any} */
    this.hlsTimer = null;

    this.bytesSinceLastTick = 0;
    this.isHls = url.toLowerCase().includes('.m3u8');
    this.seenHlsSegments = new Set();
    this.isAborted = false;
  }

  start() {
    this.isAborted = false;
    this.status = this.isHls ? 'recording' : 'downloading';

    // 检查已存在文件大小（用于断点追加）
    try {
      if (fs.existsSync(this.filePath)) {
        const stat = fs.statSync(this.filePath);
        this.downloadedBytes = stat.size;
      }
    } catch {
      this.downloadedBytes = 0;
    }

    this.writeStream = fs.createWriteStream(this.filePath, { flags: 'a' });

    // 启动速度采样与心跳定时器
    this.speedTimer = setInterval(() => {
      this.speedBytesPerSec = this.bytesSinceLastTick;
      this.bytesSinceLastTick = 0;
      this.elapsedSeconds += 1;

      this.emitProgress();
    }, 1000);

    if (this.isHls) {
      this.startHlsLoop();
    } else {
      this.startDirectStream(this.url);
    }
  }

  emitProgress() {
    this.onEvent({
      taskId: this.taskId,
      downloadedBytes: this.downloadedBytes,
      totalBytes: this.totalBytes,
      speedBytesPerSec: this.speedBytesPerSec,
      status: this.status,
      elapsedSeconds: this.elapsedSeconds,
      filePath: this.filePath,
    });
  }

  pause() {
    this.isAborted = true;
    this.cleanupNetwork();
    this.status = 'paused';
    this.speedBytesPerSec = 0;
    this.emitProgress();
  }

  stop() {
    this.isAborted = true;
    this.cleanupNetwork();
    this.status = 'completed';
    this.speedBytesPerSec = 0;
    this.emitProgress();
  }

  fail(errMsg) {
    this.isAborted = true;
    this.cleanupNetwork();
    this.status = 'failed';
    this.speedBytesPerSec = 0;
    this.onEvent({
      taskId: this.taskId,
      downloadedBytes: this.downloadedBytes,
      totalBytes: this.totalBytes,
      speedBytesPerSec: 0,
      status: 'failed',
      elapsedSeconds: this.elapsedSeconds,
      filePath: this.filePath,
      error: errMsg,
    });
  }

  cleanupNetwork() {
    if (this.speedTimer) {
      clearInterval(this.speedTimer);
      this.speedTimer = null;
    }
    if (this.hlsTimer) {
      clearTimeout(this.hlsTimer);
      this.hlsTimer = null;
    }
    if (this.currentReq) {
      try {
        this.currentReq.destroy();
      } catch {}
      this.currentReq = null;
    }
    if (this.writeStream) {
      try {
        this.writeStream.end();
      } catch {}
      this.writeStream = null;
    }
  }

  getHeaders(targetUrl) {
    const low = String(targetUrl || '').toLowerCase();
    /** @type {Record<string, string>} */
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: '*/*',
      ...this.headers,
    };
    if (!headers['Referer'] && !headers['referer']) {
      if (low.includes('douyin') || low.includes('byte') || low.includes('amemv')) {
        headers['Referer'] = 'https://live.douyin.com/';
      } else if (low.includes('bilibili') || low.includes('bilivideo') || low.includes('hdslb')) {
        headers['Referer'] = 'https://live.bilibili.com/';
      } else if (low.includes('kuaishou') || low.includes('kwai') || low.includes('yximgs')) {
        headers['Referer'] = 'https://live.kuaishou.com/';
      } else if (low.includes('huya')) {
        headers['Referer'] = 'https://www.huya.com/';
      } else if (low.includes('douyu')) {
        headers['Referer'] = 'https://www.douyu.com/';
      }
    }
    return headers;
  }

  /**
   * 直接 HTTP/HTTPS 流录制 (FLV / MP4 / TS)
   */
  startDirectStream(targetUrl) {
    if (this.isAborted) return;

    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const reqHeaders = this.getHeaders(targetUrl);

      this.currentReq = client.get(
        parsedUrl,
        { headers: reqHeaders, timeout: 15000 },
        (res) => {
          // 处理 301/302 重定向
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let nextLoc = res.headers.location;
            if (!nextLoc.startsWith('http')) {
              nextLoc = new URL(nextLoc, parsedUrl).href;
            }
            this.startDirectStream(nextLoc);
            return;
          }

          if (res.statusCode && res.statusCode >= 400) {
            this.fail(`HTTP 错误: ${res.statusCode} ${res.statusMessage || ''}`);
            return;
          }

          const cl = res.headers['content-length'];
          if (cl) {
            const parsedCl = parseInt(cl, 10);
            if (!isNaN(parsedCl) && parsedCl > 0) {
              this.totalBytes = parsedCl;
            }
          }

          res.on('data', (chunk) => {
            if (this.isAborted || !this.writeStream) return;
            this.writeStream.write(chunk);
            this.downloadedBytes += chunk.length;
            this.bytesSinceLastTick += chunk.length;
          });

          res.on('end', () => {
            if (this.isAborted) return;
            this.stop();
          });

          res.on('error', (err) => {
            if (this.isAborted) return;
            console.error('[StreamRecorder] 响应流错误:', err.message);
            this.fail(err.message);
          });
        }
      );

      this.currentReq.on('error', (err) => {
        if (this.isAborted) return;
        console.error('[StreamRecorder] 请求发送错误:', err.message);
        this.fail(err.message);
      });
    } catch (err) {
      this.fail(err.message || 'URL 解析失败');
    }
  }

  /**
   * HLS (.m3u8) 切片下载与录制循环
   */
  async startHlsLoop() {
    if (this.isAborted) return;

    try {
      const playlistText = await this.fetchText(this.url);
      if (this.isAborted) return;

      const lines = playlistText.split(/\r?\n/);
      // 判断是否包含子流 (Master Playlist)
      const streamInfIndex = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
      if (streamInfIndex !== -1 && lines[streamInfIndex + 1]) {
        let subUrl = lines[streamInfIndex + 1].trim();
        if (!subUrl.startsWith('http')) {
          subUrl = new URL(subUrl, this.url).href;
        }
        this.url = subUrl; // 重定向至具体音视频变体
        this.startHlsLoop();
        return;
      }

      // 解析切片
      let targetDuration = 2;
      const newSegments = [];
      let isVod = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-TARGETDURATION:')) {
          const td = parseInt(line.split(':')[1], 10);
          if (!isNaN(td) && td > 0) targetDuration = td;
        }
        if (line === '#EXT-X-ENDLIST') {
          isVod = true;
        }
        if (line.startsWith('#EXTINF:')) {
          const segLine = lines[i + 1]?.trim();
          if (segLine && !segLine.startsWith('#')) {
            let segUrl = segLine;
            if (!segUrl.startsWith('http')) {
              segUrl = new URL(segUrl, this.url).href;
            }
            if (!this.seenHlsSegments.has(segUrl)) {
              this.seenHlsSegments.add(segUrl);
              newSegments.push(segUrl);
            }
          }
        }
      }

      // 依次下载新发现的切片并写入文件
      for (const segUrl of newSegments) {
        if (this.isAborted) break;
        await this.downloadHlsSegment(segUrl);
      }

      if (isVod && newSegments.length === 0) {
        // VOD 点播录制已抓取完全部切片
        this.stop();
        return;
      }

      if (!this.isAborted) {
        // 直播模式：按 targetDuration 间隔轮询下一批切片
        const waitMs = Math.max(1000, Math.floor(targetDuration * 1000 * 0.8));
        this.hlsTimer = setTimeout(() => this.startHlsLoop(), waitMs);
      }
    } catch (err) {
      if (!this.isAborted) {
        // 网络短暂闪断重试
        this.hlsTimer = setTimeout(() => this.startHlsLoop(), 3000);
      }
    }
  }

  fetchText(targetUrl) {
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(targetUrl);
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.get(
          parsed,
          {
            headers: this.getHeaders(targetUrl),
            timeout: 10000,
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              let nextLoc = res.headers.location;
              if (!nextLoc.startsWith('http')) {
                nextLoc = new URL(nextLoc, parsed).href;
              }
              this.fetchText(nextLoc).then(resolve, reject);
              return;
            }
            let data = '';
            res.on('data', (d) => (data += d));
            res.on('end', () => resolve(data));
          }
        );
        req.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  downloadHlsSegment(segUrl) {
    return new Promise((resolve) => {
      if (this.isAborted || !this.writeStream) return resolve();
      try {
        const parsed = new URL(segUrl);
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.get(
          parsed,
          {
            headers: this.getHeaders(segUrl),
            timeout: 15000,
          },
          (res) => {
            res.on('data', (chunk) => {
              if (this.isAborted || !this.writeStream) return;
              this.writeStream.write(chunk);
              this.downloadedBytes += chunk.length;
              this.bytesSinceLastTick += chunk.length;
            });
            res.on('end', resolve);
            res.on('error', () => resolve());
          }
        );
        req.on('error', () => resolve());
      } catch {
        resolve();
      }
    });
  }
}

module.exports = { StreamRecorderManager };