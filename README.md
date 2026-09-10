# StreamGet

StreamGet 是一款面向专业创作者、直播运营人员和切片组的现代化跨平台直播流录制、解析下载及转播中继桌面客户端。

## 核心技术栈

- **前端 UI**: React 19 + TypeScript + Tailwind CSS + Lucide Icons + Motion
- **桌面壳**: Electron 44 (contextIsolation, preload, tray, store)
- **解析内核**: Python 3.12 + StreamGet Sidecar 桥进程（支持 26 个平台真实解析）
- **播放引擎**: HLS.js + MPEGTS.js

## 快速运行

### 1. 安装依赖

```bash
npm install
pip install -r sidecar/StreamGet/requirements.txt
```

### 2. 本地开发

- **Electron 桌面端开发**（推荐）:
  ```bash
  npm run electron:dev
  ```

- **纯浏览器调试模式**（前端 + Sidecar HTTP 服务）:
  ```bash
  npm run dev:full
  ```

### 3. 构建与打包

- **构建前端代码**:
  ```bash
  npm run build
  ```

- **打包为 Windows 安装包**:
  ```bash
  npm run electron:build
  ```

